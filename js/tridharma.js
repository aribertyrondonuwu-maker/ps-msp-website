let _tridharmaData = null;

function rp(n) { return 'Rp ' + n.toLocaleString('id-ID'); }

async function loadTridharma() {
  try {
    const res = await fetch('js/data/tridharma.json');
    _tridharmaData = await res.json();
    renderPenelitian();
    renderPengabdian();
    renderKerjasama('pendidikan');
    initKeterlibatan();
    renderPublikasiMahasiswa();
  } catch (e) {
    console.error('Gagal memuat data tridharma:', e);
  }
}

function renderPenelitian() {
  const p = _tridharmaData.penelitian;
  document.getElementById('penelitianSummary').textContent =
    `Total ${p.total_judul} judul penelitian DTPS senilai ${rp(p.total_dana_rp)} selama 2023–2025.`;

  const table = document.getElementById('penelitianTable');
  table.innerHTML = `
    <thead><tr><th>Sumber Pembiayaan</th><th>2023</th><th>2024</th><th>2025</th><th>Total Judul</th><th>Total Dana</th></tr></thead>
    <tbody>
      ${p.dana_per_sumber.map(s => `
        <tr>
          <td>${s.sumber}</td><td>${s['2023']}</td><td>${s['2024']}</td><td>${s['2025']}</td>
          <td><strong>${s.total_judul}</strong></td><td>${rp(s.total_dana_rp)}</td>
        </tr>`).join('')}
      <tr style="font-weight:700;background:#eef4f7;">
        <td>Total</td><td colspan="3"></td><td>${p.total_judul}</td><td>${rp(p.total_dana_rp)}</td>
      </tr>
    </tbody>`;
}

function renderPengabdian() {
  const p = _tridharmaData.pengabdian;
  document.getElementById('pengabdianSummary').textContent =
    `Total ${p.total_kegiatan} kegiatan PkM senilai ${rp(p.total_dana_rp)} selama 2023–2025.`;

  const table = document.getElementById('pengabdianTable');
  table.innerHTML = `
    <thead><tr><th>Sumber Pembiayaan</th><th>2023</th><th>2024</th><th>2025</th><th>Total Kegiatan</th><th>Total Dana</th></tr></thead>
    <tbody>
      ${p.dana_per_sumber.map(s => `
        <tr>
          <td>${s.sumber}</td><td>${s['2023']}</td><td>${s['2024']}</td><td>${s['2025']}</td>
          <td><strong>${s.total_kegiatan}</strong></td><td>${rp(s.total_dana_rp)}</td>
        </tr>`).join('')}
      <tr style="font-weight:700;background:#eef4f7;">
        <td>Total</td><td colspan="3"></td><td>${p.total_kegiatan}</td><td>${rp(p.total_dana_rp)}</td>
      </tr>
    </tbody>`;

  document.getElementById('desaBinaanNote').textContent =
    'Desa/kelompok masyarakat binaan hasil pengabdian DTPS PS MSP, mencakup kemitraan strategis tingkat pemerintah daerah (penyusunan RPJMD/RPJPD provinsi & kabupaten) sebagai bentuk rekognisi kepakaran.';

  const desaTable = document.getElementById('desaBinaanTable');
  desaTable.innerHTML = `
    <thead><tr><th>Mitra</th><th>Kategori</th><th>Keterangan</th></tr></thead>
    <tbody>
      ${p.desa_binaan.map(d => `
        <tr><td>${d.mitra}</td><td>${d.kategori}</td><td>${d.keterangan}</td></tr>
      `).join('')}
    </tbody>`;
}

function renderKerjasama(kategori) {
  const list = _tridharmaData.kerjasama[kategori] || [];
  const total = Object.values(_tridharmaData.kerjasama).reduce((sum, arr) => sum + arr.length, 0);
  document.getElementById('kerjasamaTotal').textContent = total;

  const table = document.getElementById('kerjasamaTable');
  table.innerHTML = `
    <thead><tr><th>Mitra</th><th>Tingkat</th><th>Judul Kegiatan</th></tr></thead>
    <tbody>
      ${list.map(k => `<tr><td>${k.mitra}</td><td>${k.tingkat}</td><td>${k.judul}</td></tr>`).join('')}
    </tbody>`;
}

document.querySelectorAll('.kerjasama-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.kerjasama-tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderKerjasama(btn.dataset.cat);
  });
});

loadTridharma();

// ---- Jurnal Ilmiah (dikelola PS MSP) ----
async function loadJurnal() {
  try {
    const res = await fetch('js/data/jurnal.json');
    const data = await res.json();

    const note = document.getElementById('jurnalPortalNote');
    if (note && data.portal) {
      note.innerHTML = `${data.portal.deskripsi} <a href="${data.portal.url}" target="_blank" rel="noopener" class="card-link" style="display:inline;">Buka Portal e-Journal Unsrat →</a>`;
    }

    const grid = document.getElementById('jurnalGrid');
    if (grid && Array.isArray(data.jurnal_kelolaan)) {
      grid.innerHTML = data.jurnal_kelolaan.map(j => {
        const cover = (j.gambar && j.gambar.trim())
          ? `<div class="jurnal-cover"><img src="${j.gambar}" alt="Sampul ${j.nama}" loading="lazy"></div>`
          : `<div class="jurnal-cover jurnal-cover-empty"><span>Sampul jurnal<br>(dapat ditambahkan admin)</span></div>`;
        const badge = (j.akreditasi && j.akreditasi.trim())
          ? `<span class="lab-badge badge-relevan-tinggi">${j.akreditasi}</span>` : '';
        return `
          <article class="card lab-card">
            ${cover}
            <div class="lab-card-body">
              <h3>${j.nama}</h3>
              ${badge}
              <p>${j.catatan}</p>
              <a href="${j.url}" target="_blank" rel="noopener" class="card-link">Kunjungi jurnal →</a>
            </div>
          </article>`;
      }).join('');
    }
  } catch (e) {
    console.error('Gagal memuat data jurnal:', e);
  }
}
loadJurnal();

// ---- Keterlibatan DTPS & Mahasiswa (multi-dosen, Tabel 3.3 & 4.2 LKPS) ----
function renderKeterlibatan(jenis) {
  if (!_tridharmaData) return;
  const data = jenis === 'pkm' ? _tridharmaData.keterlibatan_pkm : _tridharmaData.keterlibatan_penelitian;
  const table = document.getElementById('keterlibatanTable');
  if (!table || !Array.isArray(data)) return;
  table.innerHTML = `
    <thead><tr><th>Dosen (DTPS)</th><th>Judul Kegiatan</th><th>Mahasiswa Terlibat</th><th>Tahun</th></tr></thead>
    <tbody>
      ${data.map(d => `<tr><td>${d.dosen}</td><td>${d.judul}</td><td>${d.mahasiswa || '—'}</td><td>${d.tahun || '—'}</td></tr>`).join('')}
    </tbody>`;
}

function initKeterlibatan() {
  if (!_tridharmaData) return;
  const cP = document.getElementById('cntPenelitianMhs');
  const cK = document.getElementById('cntPkmMhs');
  if (cP) cP.textContent = (_tridharmaData.keterlibatan_penelitian || []).length;
  if (cK) cK.textContent = (_tridharmaData.keterlibatan_pkm || []).length;
  renderKeterlibatan('penelitian');
  document.querySelectorAll('.keterlibatan-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.keterlibatan-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderKeterlibatan(btn.dataset.jenis);
    });
  });
}

// ---- Artikel & Publikasi Mahasiswa (Tabel 3.4B & 3.3 LKPS) ----
function renderPublikasiMahasiswa() {
  if (!_tridharmaData || !_tridharmaData.publikasi_mahasiswa) return;
  const pm = _tridharmaData.publikasi_mahasiswa;

  const summary = document.getElementById('pubMhsSummary');
  if (summary) summary.textContent = pm.ringkasan.catatan;

  const statGrid = document.getElementById('pubMhsStatGrid');
  if (statGrid) {
    statGrid.innerHTML = `
      <article class="card"><h3>${pm.ringkasan.total_terakreditasi_nasional} Judul</h3><p>Publikasi mahasiswa di jurnal nasional terakreditasi</p></article>
      <article class="card"><h3>Sebaran per Tahun</h3><p>${pm.ringkasan.sebaran}</p></article>
      <article class="card"><h3>Jurnal Utama</h3><p>Mayoritas terbit di Jurnal Ilmiah Platax (SINTA 2) yang dikelola PS MSP</p></article>
    `;
  }

  const table = document.getElementById('pubMhsTable');
  if (table && Array.isArray(pm.daftar)) {
    table.innerHTML = `
      <thead><tr><th>Mahasiswa</th><th>Judul Artikel</th><th>Dosen Pembimbing</th><th>Tahun</th></tr></thead>
      <tbody>
        ${pm.daftar.map(a => `<tr><td>${a.mahasiswa}</td><td>${a.judul}</td><td>${a.pembimbing}</td><td>${a.tahun || '—'}</td></tr>`).join('')}
      </tbody>`;
  }
}
