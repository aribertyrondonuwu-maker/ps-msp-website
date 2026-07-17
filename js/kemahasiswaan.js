async function loadKemahasiswaan() {
  try {
    const res = await fetch('js/data/kemahasiswaan.json');
    const data = await res.json();

    document.getElementById('masaStudiTren').textContent = data.masa_studi.tren;

    const table = document.getElementById('mahasiswaTable');
    table.innerHTML = `
      <thead><tr><th>Tahun</th><th>Periode</th><th>Pendaftar</th><th>Mahasiswa Baru</th><th>Mahasiswa Aktif</th></tr></thead>
      <tbody>
        ${data.per_tahun.map(t => `
          <tr>
            <td>${t.tahun}</td><td>${t.label_ts}</td>
            <td>${t.pendaftar}</td><td>${t.mahasiswa_baru}</td><td><strong>${t.mahasiswa_aktif}</strong></td>
          </tr>`).join('')}
      </tbody>`;

    document.getElementById('ptwCard').innerHTML = `<h3>Kelulusan Tepat Waktu</h3><p>${data.masa_studi.lulus_tepat_waktu}</p>`;
    document.getElementById('dayaTampungCard').innerHTML = `<h3>Daya Tampung Resmi: ${data.masa_studi.daya_tampung_resmi}/tahun</h3><p>${data.masa_studi.catatan_daya_tampung}</p>`;

    const layananTable = document.getElementById('layananTable');
    layananTable.innerHTML = `
      <thead><tr><th>Layanan</th><th>Dasar Hukum</th><th>Mekanisme</th><th>Waktu Layanan</th></tr></thead>
      <tbody>
        ${data.layanan.map(l => `
          <tr>
            <td><strong>${l.nama}</strong></td>
            <td>${l.dasar_hukum}</td>
            <td>${l.mekanisme}</td>
            <td>${l.waktu_layanan}</td>
          </tr>
        `).join('')}
      </tbody>`;

    document.getElementById('prestasiList').innerHTML = data.prestasi_terpilih.map(p => `
      <div class="kegiatan-item">
        <h4>${p.nama}</h4>
        <p>${p.capaian}</p>
      </div>
    `).join('');
  } catch (e) {
    console.error('Gagal memuat data kemahasiswaan:', e);
  }
}
loadKemahasiswaan();
