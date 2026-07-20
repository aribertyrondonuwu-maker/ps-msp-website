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
async function uploadToMedia(fileOrBlob, folder, filenameHint) {
  const ext = (filenameHint || fileOrBlob.name || 'foto.jpg').split('.').pop() || 'jpg';
  const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await sb.storage.from('media').upload(path, fileOrBlob, { contentType: fileOrBlob.type || 'image/jpeg' });
  if (error) throw error;
  const { data } = sb.storage.from('media').getPublicUrl(path);
  return data.publicUrl;
}

// ─────────────────────────────────────────────────────────────────────────
// CROP FOTO INTERAKTIF — dipakai sebelum upload di semua form foto.
// openCropper(file, aspectRatio, judul) -> Promise<Blob JPEG>
// Foto otomatis diperkecil ke maksimum 1600px pada sisi terpanjang saat
// dipotong, sehingga file selalu ringan & konsisten ukurannya.
// ─────────────────────────────────────────────────────────────────────────
function openCropper(file, aspectRatio, judul) {
  return new Promise((resolve, reject) => {
    const modal = document.getElementById('cropModal');
    const frame = document.getElementById('cropFrame');
    const imgEl = document.getElementById('cropImg');
    const zoomEl = document.getElementById('cropZoom');
    const titleEl = document.getElementById('cropTitle');
    const confirmBtn = document.getElementById('cropConfirmBtn');
    const cancelBtn = document.getElementById('cropCancelBtn');

    titleEl.textContent = judul || 'Sesuaikan Foto';

    // Atur rasio bingkai crop (mis. 1 = persegi, 16/9 = lanskap, 3/4 = potret)
    const frameWidth = 380;
    const frameHeight = Math.round(frameWidth / aspectRatio);
    frame.style.width = frameWidth + 'px';
    frame.style.height = frameHeight + 'px';

    const reader = new FileReader();
    reader.onload = (ev) => {
      imgEl.src = ev.target.result;
      imgEl.onload = () => {
        // Skala awal: gambar menutupi penuh bingkai (seperti object-fit: cover)
        const natW = imgEl.naturalWidth, natH = imgEl.naturalHeight;
        const coverScale = Math.max(frameWidth / natW, frameHeight / natH);
        let scale = coverScale;
        let posX = (frameWidth - natW * scale) / 2;
        let posY = (frameHeight - natH * scale) / 2;

        function applyTransform() {
          imgEl.style.width = (natW * scale) + 'px';
          imgEl.style.height = (natH * scale) + 'px';
          imgEl.style.transform = `translate(${posX}px, ${posY}px)`;
        }
        function clampPos() {
          const w = natW * scale, h = natH * scale;
          posX = Math.min(0, Math.max(frameWidth - w, posX));
          posY = Math.min(0, Math.max(frameHeight - h, posY));
        }
        applyTransform();

        zoomEl.value = 1;
        zoomEl.oninput = () => {
          const zoomFactor = parseFloat(zoomEl.value);
          scale = coverScale * zoomFactor;
          clampPos();
          applyTransform();
        };

        // Drag (mouse & touch) untuk memposisikan foto
        let dragging = false, startX = 0, startY = 0, origX = 0, origY = 0;
        function pointerDown(x, y) { dragging = true; startX = x; startY = y; origX = posX; origY = posY; }
        function pointerMove(x, y) {
          if (!dragging) return;
          posX = origX + (x - startX);
          posY = origY + (y - startY);
          clampPos();
          applyTransform();
        }
        function pointerUp() { dragging = false; }

        frame.onmousedown = (e) => pointerDown(e.clientX, e.clientY);
        window.onmousemove = (e) => pointerMove(e.clientX, e.clientY);
        window.onmouseup = pointerUp;
        frame.ontouchstart = (e) => { const t = e.touches[0]; pointerDown(t.clientX, t.clientY); };
        frame.ontouchmove = (e) => { const t = e.touches[0]; pointerMove(t.clientX, t.clientY); e.preventDefault(); };
        frame.ontouchend = pointerUp;

        modal.classList.add('open');

        function cleanup() {
          modal.classList.remove('open');
          frame.onmousedown = null; window.onmousemove = null; window.onmouseup = null;
          frame.ontouchstart = null; frame.ontouchmove = null; frame.ontouchend = null;
          zoomEl.oninput = null; confirmBtn.onclick = null; cancelBtn.onclick = null;
        }

        confirmBtn.onclick = () => {
          // Render hasil crop ke canvas pada resolusi maksimum 1600px sisi terpanjang
          const OUT_MAX = 1600;
          const outW = aspectRatio >= 1 ? OUT_MAX : Math.round(OUT_MAX * aspectRatio);
          const outH = aspectRatio >= 1 ? Math.round(OUT_MAX / aspectRatio) : OUT_MAX;
          const canvas = document.createElement('canvas');
          canvas.width = outW; canvas.height = outH;
          const ctx = canvas.getContext('2d');
          // Petakan area bingkai (frameWidth x frameHeight) ke ukuran output
          const scaleOut = outW / frameWidth;
          ctx.drawImage(
            imgEl,
            0, 0, natW, natH,
            posX * scaleOut, posY * scaleOut, natW * scale * scaleOut, natH * scale * scaleOut
          );
          canvas.toBlob((blob) => {
            cleanup();
            if (!blob) { reject(new Error('Gagal memproses gambar')); return; }
            resolve(blob);
          }, 'image/jpeg', 0.87);
        };
        cancelBtn.onclick = () => { cleanup(); reject(new Error('dibatalkan')); };
      };
    };
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsDataURL(file);
  });
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

// ── Foto berita: pilih → crop sesuai rasio → upload → preview ──
function setBeritaFotoPreview(url) {
  const prev = document.getElementById('beritaFotoPreview');
  const hapusBtn = document.getElementById('beritaFotoHapus');
  if (url) {
    prev.innerHTML = `<img src="${url}" alt="preview">`;
    hapusBtn.style.display = 'inline-block';
  } else {
    prev.innerHTML = '<span>Belum ada gambar</span>';
    hapusBtn.style.display = 'none';
  }
}

document.getElementById('beritaFotoInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const status = document.getElementById('beritaFotoStatus');
  const rasioVal = document.getElementById('beritaFotoRasio').value;
  try {
    let toUpload;
    if (rasioVal === 'asli') {
      // Tanpa crop: unggah gambar utuh apa adanya (cocok untuk flyer/poster penuh)
      status.textContent = 'Mengunggah gambar utuh…';
      toUpload = file;
    } else {
      status.textContent = 'Menyiapkan gambar…';
      const rasio = parseFloat(rasioVal) || (4 / 3);
      toUpload = await openCropper(file, rasio, 'Sesuaikan Gambar Berita');
      status.textContent = 'Mengunggah…';
    }
    const url = await uploadToMedia(toUpload, 'berita', 'berita.jpg');
    document.getElementById('beritaFotoUrl').value = url;
    setBeritaFotoPreview(url);
    status.textContent = '✅ Gambar siap.';
  } catch (err) {
    status.textContent = '⚠️ ' + (err.message || 'Gagal memproses gambar');
  } finally {
    e.target.value = '';
  }
});

document.getElementById('beritaFotoHapus').addEventListener('click', () => {
  document.getElementById('beritaFotoUrl').value = '';
  setBeritaFotoPreview('');
  document.getElementById('beritaFotoStatus').textContent = 'Gambar dihapus dari berita ini.';
});

document.getElementById('beritaForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('beritaId').value;
  const payload = {
    judul: document.getElementById('beritaJudul').value.trim(),
    kategori: document.getElementById('beritaKategori').value,
    konten: document.getElementById('beritaKonten').value.trim(),
    published: document.getElementById('beritaPublished').checked,
    gambar_url: document.getElementById('beritaFotoUrl').value || null,
    gambar_rasio: document.getElementById('beritaFotoRasio').value || '1.3333',
    gambar_lebar: document.getElementById('beritaFotoLebar').value || '42',
  };
  if (!id) {
    payload.slug = payload.judul.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60) + '-' + Date.now();
  }
  const query = id ? sb.from('berita').update(payload).eq('id', id) : sb.from('berita').insert([payload]);
  const { error } = await query;
  if (error) { alert('Gagal menyimpan: ' + error.message); return; }
  document.getElementById('beritaForm').reset();
  document.getElementById('beritaId').value = '';
  document.getElementById('beritaFotoUrl').value = '';
  setBeritaFotoPreview('');
  document.getElementById('beritaFotoStatus').textContent = '';
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
  document.getElementById('beritaFotoUrl').value = b.gambar_url || '';
  document.getElementById('beritaFotoRasio').value = b.gambar_rasio || '1.3333';
  document.getElementById('beritaFotoLebar').value = b.gambar_lebar || '42';
  setBeritaFotoPreview(b.gambar_url || '');
  document.getElementById('beritaFotoStatus').textContent = '';
  document.getElementById('beritaCancelEdit').style.display = 'inline-block';
}
document.getElementById('beritaCancelEdit').addEventListener('click', () => {
  document.getElementById('beritaForm').reset();
  document.getElementById('beritaId').value = '';
  document.getElementById('beritaFotoUrl').value = '';
  setBeritaFotoPreview('');
  document.getElementById('beritaFotoStatus').textContent = '';
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
  status.textContent = '';
  const tipe = document.getElementById('galeriTipe').value;
  const kategori = document.getElementById('galeriKategori').value;
  const caption = document.getElementById('galeriCaption').value.trim();
  let url = document.getElementById('galeriVideoUrl').value.trim();
  const file = document.getElementById('galeriFile').files[0];

  try {
    if (tipe === 'foto') {
      if (!file) { status.textContent = '⚠️ Pilih file foto dulu.'; return; }
      const cropped = await openCropper(file, 4 / 3, 'Sesuaikan Foto Galeri');
      status.textContent = 'Mengunggah…';
      url = await uploadToMedia(cropped, 'galeri', 'foto.jpg');
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
    if (err.message !== 'dibatalkan') status.textContent = '⚠️ Gagal: ' + err.message;
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
  try {
    const cropped = await openCropper(file, 3 / 4, 'Sesuaikan Foto Dosen');
    status.textContent = 'Mengunggah…';
    const url = await uploadToMedia(cropped, 'dosen', 'foto.jpg');
    const { error } = await sb.from('site_settings').upsert([{ key: `dosen_foto:${slug}`, value: url, updated_at: new Date().toISOString() }]);
    if (error) throw error;
    status.textContent = '✅ Foto tersimpan.';
    document.getElementById('dosenFotoForm').reset();
    loadDosenFoto();
  } catch (err) {
    if (err.message !== 'dibatalkan') status.textContent = '⚠️ Gagal: ' + err.message;
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
  const isKorprodi = key === 'korprodi_foto';
  try {
    const cropped = await openCropper(file, isKorprodi ? 3 / 4 : 16 / 9, isKorprodi ? 'Sesuaikan Foto Koordinator' : 'Sesuaikan Foto Header Halaman');
    status.textContent = 'Mengunggah…';
    const url = await uploadToMedia(cropped, 'header', 'foto.jpg');
    const { error } = await sb.from('site_settings').upsert([{ key, value: url, updated_at: new Date().toISOString() }]);
    if (error) throw error;
    status.textContent = '✅ Foto header tersimpan.';
    document.getElementById('headerFotoForm').reset();
    loadHeaderFoto();
  } catch (err) {
    if (err.message !== 'dibatalkan') status.textContent = '⚠️ Gagal: ' + err.message;
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
  try {
    const cropped = await openCropper(fileInput.files[0], 16 / 9, 'Sesuaikan Foto Slideshow');
    status.textContent = 'Mengupload…';
    const url = await uploadToMedia(cropped, 'slideshow', 'foto.jpg');
    const key = 'slideshow:' + Date.now();
    const { error } = await sb.from('site_settings').upsert({ key, value: url, updated_at: new Date().toISOString() });
    if (error) throw error;
    status.textContent = '✅ Foto ditambahkan ke slideshow beranda.';
    document.getElementById('slideshowForm').reset();
    loadSlideshow();
  } catch (err) {
    if (err.message !== 'dibatalkan') status.textContent = '⚠️ Gagal: ' + err.message;
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
        <img src="${s.value}" alt="" style="background:#fff;padding:8px;box-sizing:border-box;">
        <div class="body">
          <strong style="color:#fff;">Logo</strong>
          <button onclick="deleteSetting('${s.key}', loadLogoFooter)">Hapus</button>
        </div>
      </div>
    `).join('') || '<p class="muted">Belum ada logo header.</p>';
  } catch (e) { grid.innerHTML = `<p>Gagal memuat: ${e.message}</p>`; }
}

// Resize khusus LOGO: tidak dipotong (crop), hanya diperkecil sambil menjaga
// rasio asli dan transparansi PNG — supaya bentuk logo tidak rusak.
function resizeLogo(file, maxDim) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = Math.round(height * maxDim / width); width = maxDim; }
          else { width = Math.round(width * maxDim / height); height = maxDim; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error('Gagal memproses logo')); return; }
          resolve(blob);
        }, 'image/png');
      };
      img.onerror = () => reject(new Error('Gagal membaca gambar'));
      img.src = ev.target.result;
    };
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsDataURL(file);
  });
}

document.getElementById('logoFooterForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const status = document.getElementById('logoFooterStatus');
  const fileInput = document.getElementById('logoFooterFile');
  if (!fileInput.files[0]) return;
  status.textContent = 'Memproses & mengupload…';
  try {
    const resized = await resizeLogo(fileInput.files[0], 500);
    const url = await uploadToMedia(resized, 'logo', 'logo.png');
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
