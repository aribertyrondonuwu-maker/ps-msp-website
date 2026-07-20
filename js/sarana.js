async function loadSarana() {
  try {
    const res = await fetch('js/data/sarana.json');
    const data = await res.json();
    const r = data.ringkasan;

    document.getElementById('ringkasanSaranaGrid').innerHTML = `
      <article class="card"><h3>${r.jumlah_lab_aktif} Laboratorium Aktif</h3><p>${r.dasar_hukum}</p></article>
      <article class="card"><h3>Investasi Sarana</h3><p>${r.investasi_rata_rata_tahunan}</p></article>
      <article class="card"><h3>Kepuasan Mahasiswa</h3><p>${r.kepuasan_mahasiswa}</p></article>
    `;

    document.getElementById('labGrid').innerHTML = data.laboratorium.map(l => `
      <article class="card" style="${l.highlight ? 'border:2px solid var(--teal);' : ''}">
        <h3>${l.highlight ? '⭐ ' : ''}${l.nama}</h3>
        <p>${l.deskripsi}</p>
      </article>
    `).join('');

    document.getElementById('sopList').innerHTML = data.standar_pengelolaan.map(s => `
      <div class="kegiatan-item"><p>${s}</p></div>
    `).join('');
  } catch (e) {
    console.error('Gagal memuat data sarana:', e);
  }
}
loadSarana();
