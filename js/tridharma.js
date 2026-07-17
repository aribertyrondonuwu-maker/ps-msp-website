let _tridharmaData = null;

function rp(n) { return 'Rp ' + n.toLocaleString('id-ID'); }

async function loadTridharma() {
  try {
    const res = await fetch('js/data/tridharma.json');
    _tridharmaData = await res.json();
    renderPenelitian();
    renderPengabdian();
    renderKerjasama('pendidikan');
  } catch (e) {
    console.error('Gagal memuat data tridharma:', e);
  }
}

function renderPenelitian() {
  const p = _tridharmaData.penelitian;
  document.getElementById('penelitianSummary').textContent =
    `Total ${p.total_judul} judul penelitian DTPS senilai ${rp(p.total_dana_rp)} selama 2023–2025 (Tabel 3.2 LKPS).`;

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
    `Total ${p.total_kegiatan} kegiatan PkM senilai ${rp(p.total_dana_rp)} selama 2023–2025 (Tabel 4.1 LKPS).`;

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
    `${_tridharmaData._meta.catatan}`;

  const desaTable = document.getElementById('desaBinaanTable');
  desaTable.innerHTML = `
    <thead><tr><th>Dosen</th><th>Mitra</th><th>Kategori</th><th>Keterangan</th></tr></thead>
    <tbody>
      ${p.desa_binaan.map(d => `
        <tr><td>${d.dosen}</td><td>${d.mitra}</td><td>${d.kategori}</td><td>${d.keterangan}</td></tr>
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
