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
  const { data: adminRow, error } = await sb.from('admin_users').select('*').eq('username', email).maybeSingle();
  if (error || !adminRow) {
    document.getElementById('loginError').textContent = '⚠️ Akun ini belum terdaftar sebagai admin. Hubungi superadmin.';
    await sb.auth.signOut();
    showLogin();
    return;
  }
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
    errEl.textContent = '⚠️ Email atau password salah.';
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
  const { data, error } = await sb.from('site_settings').select('*').like('key', 'hero:%');
  if (error) { grid.innerHTML = `<p>Gagal memuat: ${error.message}</p>`; return; }
  grid.innerHTML = data.map(s => `
    <div class="admin-preview-card">
      <img src="${s.value}" alt="">
      <div class="body">
        <strong>${s.key.replace('hero:', '')}</strong>
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
checkSession();
