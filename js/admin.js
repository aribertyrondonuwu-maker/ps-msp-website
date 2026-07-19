const sb = window.sbClient;

// ─────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────
let currentRole = null;

async function checkSession() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    await resolveRoleAndShow(session.user.email);
  } else {
    showLogin();
  }
}

async function resolveRoleAndShow(email) {
  const errEl = document.getElementById('loginError');
  // Cari baris admin_users secara case-insensitive (ilike), lebih tahan terhadap perbedaan huruf besar/kecil
  let adminRow = null, error = null;
  try {
    const res = await sb.from('admin_users').select('*').ilike('username', email).maybeSingle();
    adminRow = res.data; error = res.error;
  } catch (e) { error = e; }

  if (error) {
    // Query gagal — kemungkinan besar RLS memblokir SELECT. Beri pesan diagnostik, jangan langsung logout.
    errEl.textContent = '⚠️ Login berhasil, tetapi gagal membaca data admin (kemungkinan kebijakan keamanan tabel). Detail: ' + (error.message || error);
    console.error('resolveRole error:', error);
    return;
  }
  if (!adminRow) {
    errEl.textContent = '⚠️ Login berhasil, tetapi email ini belum terdaftar di tabel admin_users. Pastikan kolom username = ' + email;
    return;
  }
  errEl.textContent = '';
  currentRole = adminRow.role;
  showDashboard(email);
}

function showLogin() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('dashboard').style.display = 'none';
}

function showDashboard(email) {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('dashboard').style.display = 'flex';
  document.getElementById('adminEmail').textContent = email;
  const badge = document.getElementById('adminRoleBadge');
  badge.textContent = currentRole;
  badge.className = 'role-badge ' + currentRole;
  document.body.classList.toggle('is-superadmin', currentRole === 'superadmin');

  loadBerita();
  loadGaleri();
  loadDosenDropdown();
  loadDosenFoto();
  if (currentRole === 'superadmin') {
    loadHeaderFoto();
    loadDiskusi();
    loadAdminUsers();
    loadSosmed();
    loadSlideshow();
    loadLogoFooter();
  }
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');
  errEl.textContent = '';
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
      errEl.textContent = '⚠️ Email belum dikonfirmasi. Buka Supabase → Authentication → Users → klik akun Anda → "Confirm email", lalu login ulang.';
    } else if (msg.includes('invalid')) {
      errEl.textContent = '⚠️ Email atau password salah.';
    } else {
      errEl.textContent = '⚠️ Gagal masuk: ' + error.message;
    }
    return;
  }
  resolveRoleAndShow(data.user.email);
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await sb.auth.signOut();
  showLogin();
});

// ─────────────────────────────────────────────────────────────────────────
// TAB NAVIGATION
// ─────────────────────────────────────────────────────────────────────────
document.querySelectorAll('.admin-nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// STORAGE UPLOAD HELPER
// ─────────────────────────────────────────────────────────────────────────
async function uploadToMedia(file, folder) {
  const ext = file.name.split('.').pop();
  const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await sb.storage.from('media').upload(path, file);
  if (error) throw error;
  const { data } = sb.storage.from('media').getPublicUrl(path);
  return data.publicUrl;
}

// ─────────────────────────────────────────────────────────────────────────
// BERITA
// ─────────────────────────────────────────────────────────────────────────
async function loadBerita() {
  const { data, error } = await sb.from('berita').select('*').order('tanggal_publish', { ascending: false });
  const table = document.getElementById('beritaTable');
  if (error) { table.innerHTML = `<tbody><tr><td>Gagal memuat: ${error.message}</td></tr></tbody>`; return; }
  table.innerHTML = `
    <thead><tr><th>Judul</th><th>Kategori</th><th>Status</th><th>Aksi</th></tr></thead>
    <tbody>
      ${data.map(b => `
        <tr>
          <td>${b.judul}</td>
          <td>${b.kategori || '-'}</td>
          <td>${b.published ? '✅ Terbit' : '⏳ Draft'}</td>
          <td>
            <button onclick="editBerita('${b.id}')" class="btn-outline-dark" style="padding:4px 10px;font-size:0.75rem;">Edit</button>
            <button onclick="deleteBerita('${b.id}')" class="btn-delete" style="border:0;">Hapus</button>
          </td>
        </tr>
      `).join('')}
    </tbody>`;
  window._beritaCache = data;
}

document.getElementById('beritaForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('beritaId').value;
  const payload = {
    judul: document.getElementById('beritaJudul').value.trim(),
    kategori: document.getElementById('beritaKategori').value,
    konten: document.getElementById('beritaKonten').value.trim(),
    published: document.getElementById('beritaPublished').checked,
  };
  if (!id) {
    payload.slug = payload.judul.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60) + '-' + Date.now();
  }
  const query = id ? sb.from('berita').update(payload).eq('id', id) : sb.from('berita').insert([payload]);
  const { error } = await query;
  if (error) { alert('Gagal menyimpan: ' + error.message); return; }
  document.getElementById('beritaForm').reset();
  document.getElementById('beritaId').value = '';
  document.getElementById('beritaCancelEdit').style.display = 'none';
  loadBerita();
});

function editBerita(id) {
  const b = window._beritaCache.find(x => x.id === id);
  if (!b) return;
  document.getElementById('beritaId').value = b.id;
  document.getElementById('beritaJudul').value = b.judul;
  document.getElementById('beritaKategori').value = b.kategori || 'Akademik';
  document.getElementById('beritaKonten').value = b.konten || '';
  document.getElementById('beritaPublished').checked = b.published;
  document.getElementById('beritaCancelEdit').style.display = 'inline-block';
}
document.getElementById('beritaCancelEdit').addEventListener('click', () => {
  document.getElementById('beritaForm').reset();
  document.getElementById('beritaId').value = '';
  document.getElementById('beritaCancelEdit').style.display = 'none';
});

async function deleteBerita(id) {
  if (!confirm('Hapus berita ini?')) return;
  await sb.from('berita').delete().eq('id', id);
  loadBerita();
}

// ─────────────────────────────────────────────────────────────────────────
// GALERI
// ─────────────────────────────────────────────────────────────────────────
async function loadGaleri() {
  const { data, error } = await sb.from('galeri').select('*').order('created_at', { ascending: false });
  const grid = document.getElementById('galeriPreviewGrid');
  if (error) { grid.innerHTML = `<p>Gagal memuat: ${error.message}</p>`; return; }
  grid.innerHTML = data.map(g => `
    <div class="admin-preview-card">
      ${g.tipe === 'foto' ? `<img src="${g.url}" alt="">` : `<div style="height:120px;background:#111;color:#fff;display:flex;align-items:center;justify-content:center;">🎬 Video</div>`}
      <div class="body">
        <strong>${g.kategori || ''}</strong>
        <p>${g.caption || g.judul || ''}</p>
        <button onclick="deleteGaleri('${g.id}')">Hapus</button>
      </div>
    </div>
  `).join('') || '<p class="muted">Belum ada item galeri dari database (galeri statis tetap tampil di situs).</p>';
}

document.getElementById('galeriForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const status = document.getElementById('galeriStatus');
  status.textContent = 'Mengunggah…';
  const tipe = document.getElementById('galeriTipe').value;
  const kategori = document.getElementById('galeriKategori').value;
  const caption = document.getElementById('galeriCaption').value.trim();
  let url = document.getElementById('galeriVideoUrl').value.trim();
  const file = document.getElementById('galeriFile').files[0];

  try {
    if (tipe === 'foto') {
      if (!file) { status.textContent = '⚠️ Pilih file foto dulu.'; return; }
      url = await uploadToMedia(file, 'galeri');
    } else if (!url) {
      status.textContent = '⚠️ Isi link embed YouTube untuk video.';
      return;
    }
    const { error } = await sb.from('galeri').insert([{ tipe, kategori, caption, url }]);
    if (error) throw error;
    status.textContent = '✅ Berhasil ditambahkan.';
    document.getElementById('galeriForm').reset();
    loadGaleri();
  } catch (err) {
    status.textContent = '⚠️ Gagal: ' + err.message;
  }
});

async function deleteGaleri(id) {
  if (!confirm('Hapus item galeri ini?')) return;
  await sb.from('galeri').delete().eq('id', id);
  loadGaleri();
}

// ─────────────────────────────────────────────────────────────────────────
// FOTO DOSEN (disimpan di site_settings, key = dosen_foto:{slug})
// ─────────────────────────────────────────────────────────────────────────
async function loadDosenDropdown() {
  const select = document.getElementById('dosenFotoSelect');
  try {
    const res = await fetch('js/data/dosen.json');
    const dosen = await res.json();
    select.innerHTML = dosen.map(d => `<option value="${d.id}">${d.nama}</option>`).join('');
  } catch (e) { console.error(e); }
}

document.getElementById('dosenFotoForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const status = document.getElementById('dosenFotoStatus');
  const slug = document.getElementById('dosenFotoSelect').value;
  const file = document.getElementById('dosenFotoFile').files[0];
  if (!file) return;
  status.textContent = 'Mengunggah…';
  try {
    const url = await uploadToMedia(file, 'dosen');
    const { error } = await sb.from('site_settings').upsert([{ key: `dosen_foto:${slug}`, value: url, updated_at: new Date().toISOString() }]);
    if (error) throw error;
    status.textContent = '✅ Foto tersimpan.';
    document.getElementById('dosenFotoForm').reset();
    loadDosenFoto();
  } catch (err) {
    status.textContent = '⚠️ Gagal: ' + err.message;
  }
});

async function loadDosenFoto() {
  const grid = document.getElementById('dosenFotoGrid');
  const { data, error } = await sb.from('site_settings').select('*').like('key', 'dosen_foto:%');
  if (error) { grid.innerHTML = `<p>Gagal memuat: ${error.message}</p>`; return; }
  grid.innerHTML = data.map(s => `
    <div class="admin-preview-card">
      <img src="${s.value}" alt="">
      <div class="body">
        <strong>${s.key.replace('dosen_foto:', '')}</strong>
        <button onclick="deleteSetting('${s.key}', loadDosenFoto)">Hapus</button>
      </div>
    </div>
  `).join('') || '<p class="muted">Belum ada foto dosen diunggah.</p>';
}

// ─────────────────────────────────────────────────────────────────────────
// FOTO HEADER HALAMAN (site_settings, key = hero:{halaman})
// ─────────────────────────────────────────────────────────────────────────
document.getElementById('headerFotoForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const status = document.getElementById('headerFotoStatus');
  const key = document.getElementById('headerFotoSelect').value;
  const file = document.getElementById('headerFotoFile').files[0];
  if (!file) return;
  status.textContent = 'Mengunggah…';
  try {
    const url = await uploadToMedia(file, 'header');
    const { error } = await sb.from('site_settings').upsert([{ key, value: url, updated_at: new Date().toISOString() }]);
    if (error) throw error;
    status.textContent = '✅ Foto header tersimpan.';
    document.getElementById('headerFotoForm').reset();
    loadHeaderFoto();
  } catch (err) {
    status.textContent = '⚠️ Gagal: ' + err.message;
  }
});

async function loadHeaderFoto() {
  const grid = document.getElementById('headerFotoGrid');
  const { data, error } = await sb.from('site_settings').select('*').or('key.like.hero:%,key.eq.korprodi_foto');
  if (error) { grid.innerHTML = `<p>Gagal memuat: ${error.message}</p>`; return; }
  grid.innerHTML = data.map(s => `
    <div class="admin-preview-card">
      <img src="${s.value}" alt="">
      <div class="body">
        <strong>${s.key === 'korprodi_foto' ? 'Foto Koordinator' : s.key.replace('hero:', '')}</strong>
        <button onclick="deleteSetting('${s.key}', loadHeaderFoto)">Hapus</button>
      </div>
    </div>
  `).join('') || '<p class="muted">Belum ada foto header diunggah — halaman memakai gradient default.</p>';
}

async function deleteSetting(key, callback) {
  if (!confirm('Hapus foto ini?')) return;
  await sb.from('site_settings').delete().eq('key', key);
  callback();
}

// ─────────────────────────────────────────────────────────────────────────
// DISKUSI ALUMNI (moderasi)
// ─────────────────────────────────────────────────────────────────────────
async function loadDiskusi() {
  const list = document.getElementById('diskusiAdminList');
  const { data, error } = await sb.from('alumni_diskusi').select('*').order('created_at', { ascending: false });
  if (error) { list.innerHTML = `<p>Gagal memuat: ${error.message}</p>`; return; }
  list.innerHTML = data.map(d => `
    <div class="diskusi-admin-item ${d.approved ? 'approved' : 'pending'}">
      <div>
        <strong>${d.nama}</strong> ${d.angkatan ? '· Angkatan ' + d.angkatan : ''}
        <p>${d.pesan}</p>
      </div>
      <div class="diskusi-admin-actions">
        ${!d.approved ? `<button class="btn-approve" onclick="approveDiskusi('${d.id}')">Setujui</button>` : ''}
        <button class="btn-delete" onclick="deleteDiskusi('${d.id}')">Hapus</button>
      </div>
    </div>
  `).join('') || '<p class="muted">Belum ada pesan diskusi.</p>';
}

async function approveDiskusi(id) {
  await sb.from('alumni_diskusi').update({ approved: true }).eq('id', id);
  loadDiskusi();
}
async function deleteDiskusi(id) {
  if (!confirm('Hapus pesan ini?')) return;
  await sb.from('alumni_diskusi').delete().eq('id', id);
  loadDiskusi();
}

// ─────────────────────────────────────────────────────────────────────────
// KELOLA ADMIN (superadmin only)
// ─────────────────────────────────────────────────────────────────────────
async function loadAdminUsers() {
  const table = document.getElementById('adminUserTable');
  const { data, error } = await sb.from('admin_users').select('*').order('role');
  if (error) { table.innerHTML = `<tbody><tr><td>Gagal memuat: ${error.message}</td></tr></tbody>`; return; }
  table.innerHTML = `
    <thead><tr><th>Email</th><th>Nama</th><th>Peran</th><th>Aksi</th></tr></thead>
    <tbody>
      ${data.map(a => `
        <tr>
          <td>${a.username}</td><td>${a.nama || '-'}</td>
          <td><span class="role-badge ${a.role}" style="color:${a.role === 'superadmin' ? '#fff' : '#0f172a'};">${a.role}</span></td>
          <td>${a.username !== document.getElementById('adminEmail').textContent ? `<button class="btn-delete" onclick="deleteAdminUser('${a.id}')">Hapus akses</button>` : '<em class="muted">akun Anda</em>'}</td>
        </tr>
      `).join('')}
    </tbody>`;
}

document.getElementById('adminUserForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const status = document.getElementById('adminUserStatus');
  const email = document.getElementById('newAdminEmail').value.trim();
  const password = document.getElementById('newAdminPassword').value;
  const nama = document.getElementById('newAdminNama').value.trim();
  const role = document.getElementById('newAdminRole').value;
  status.textContent = 'Membuat akun…';
  try {
    const { data: signUpData, error: signUpError } = await sb.auth.signUp({ email, password });
    if (signUpError) throw signUpError;
    const { error: insertError } = await sb.from('admin_users').insert([{ username: email, password_hash: 'n/a - pakai Supabase Auth', nama, role }]);
    if (insertError) throw insertError;
    status.textContent = '✅ Admin ditambahkan. Catatan: Anda mungkin otomatis ter-logout dari sesi ini karena keterbatasan teknis Supabase saat membuat akun baru — cukup login ulang sebagai superadmin jika itu terjadi.';
    document.getElementById('adminUserForm').reset();
    loadAdminUsers();
  } catch (err) {
    status.textContent = '⚠️ Gagal: ' + err.message;
  }
});

async function deleteAdminUser(id) {
  if (!confirm('Cabut akses admin ini? (Akun login tetap ada, tapi tidak bisa masuk dashboard lagi)')) return;
  await sb.from('admin_users').delete().eq('id', id);
  loadAdminUsers();
}

// ─────────────────────────────────────────────────────────────────────────
// SLIDESHOW BERANDA (superadmin only) — site_settings key slideshow:{id}
// ─────────────────────────────────────────────────────────────────────────
async function loadSlideshow() {
  const grid = document.getElementById('slideshowGrid');
  if (!grid) return;
  try {
    const { data } = await sb.from('site_settings').select('*').like('key', 'slideshow:%');
    grid.innerHTML = (data || []).map(s => `
      <div class="admin-preview-card">
        <img src="${s.value}" alt="">
        <div class="body">
          <strong>Foto slideshow</strong>
          <button onclick="deleteSetting('${s.key}', loadSlideshow)">Hapus</button>
        </div>
      </div>
    `).join('') || '<p class="muted">Belum ada foto slideshow. Beranda memakai gradient/foto header default.</p>';
  } catch (e) { grid.innerHTML = `<p>Gagal memuat: ${e.message}</p>`; }
}

document.getElementById('slideshowForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const status = document.getElementById('slideshowStatus');
  const fileInput = document.getElementById('slideshowFile');
  if (!fileInput.files[0]) return;
  status.textContent = 'Mengupload…';
  try {
    const url = await uploadToMedia(fileInput.files[0], 'slideshow');
    const key = 'slideshow:' + Date.now();
    const { error } = await sb.from('site_settings').upsert({ key, value: url, updated_at: new Date().toISOString() });
    if (error) throw error;
    status.textContent = '✅ Foto ditambahkan ke slideshow beranda.';
    document.getElementById('slideshowForm').reset();
    loadSlideshow();
  } catch (err) {
    status.textContent = '⚠️ Gagal: ' + err.message;
  }
});

// ─────────────────────────────────────────────────────────────────────────
// LOGO FOOTER (superadmin only) — site_settings key logo:{id}
// ─────────────────────────────────────────────────────────────────────────
async function loadLogoFooter() {
  const grid = document.getElementById('logoFooterGrid');
  if (!grid) return;
  try {
    const { data } = await sb.from('site_settings').select('*').like('key', 'logo:%');
    grid.innerHTML = (data || []).map(s => `
      <div class="admin-preview-card" style="background:#0a2540;">
        <img src="${s.value}" alt="" style="filter:brightness(0) invert(1);">
        <div class="body">
          <strong style="color:#fff;">Logo</strong>
          <button onclick="deleteSetting('${s.key}', loadLogoFooter)">Hapus</button>
        </div>
      </div>
    `).join('') || '<p class="muted">Belum ada logo footer.</p>';
  } catch (e) { grid.innerHTML = `<p>Gagal memuat: ${e.message}</p>`; }
}

document.getElementById('logoFooterForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const status = document.getElementById('logoFooterStatus');
  const fileInput = document.getElementById('logoFooterFile');
  if (!fileInput.files[0]) return;
  status.textContent = 'Mengupload…';
  try {
    const url = await uploadToMedia(fileInput.files[0], 'logo');
    const key = 'logo:' + Date.now();
    const { error } = await sb.from('site_settings').upsert({ key, value: url, updated_at: new Date().toISOString() });
    if (error) throw error;
    status.textContent = '✅ Logo ditambahkan ke footer.';
    document.getElementById('logoFooterForm').reset();
    loadLogoFooter();
  } catch (err) {
    status.textContent = '⚠️ Gagal: ' + err.message;
  }
});

// ─────────────────────────────────────────────────────────────────────────
// MEDIA SOSIAL (superadmin only) — site_settings key sosmed:{platform}
// ─────────────────────────────────────────────────────────────────────────
const SOSMED_PLATFORMS = ['facebook', 'instagram', 'youtube', 'tiktok', 'whatsapp'];

async function loadSosmed() {
  try {
    const { data } = await sb.from('site_settings').select('key,value').like('key', 'sosmed:%');
    (data || []).forEach(row => {
      const platform = row.key.replace('sosmed:', '');
      const input = document.getElementById('sosmed_' + platform);
      if (input) input.value = row.value || '';
    });
  } catch (e) { console.error(e); }
}

document.getElementById('sosmedForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const status = document.getElementById('sosmedStatus');
  status.textContent = 'Menyimpan…';
  try {
    const rows = SOSMED_PLATFORMS.map(p => ({
      key: 'sosmed:' + p,
      value: document.getElementById('sosmed_' + p).value.trim(),
      updated_at: new Date().toISOString()
    }));
    const { error } = await sb.from('site_settings').upsert(rows);
    if (error) throw error;
    status.textContent = '✅ Media sosial tersimpan. Ikon akan muncul di footer situs.';
  } catch (err) {
    status.textContent = '⚠️ Gagal: ' + err.message;
  }
});

// ─────────────────────────────────────────────────────────────────────────
checkSession();
