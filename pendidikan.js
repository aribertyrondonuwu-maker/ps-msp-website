async function loadPendidikan() {
  try {
    const res = await fetch('js/data/pendidikan.json');
    const d = await res.json();

    document.getElementById('pendidikanPengantar').textContent = d.pengantar;

    const s = d.statistik;
    document.getElementById('statPendidikanGrid').innerHTML = `
      <article class="card"><h3>${s.kurikulum}</h3><p>${s.paradigma}</p></article>
      <article class="card"><h3>88%</h3><p>${s.capaian_iku7}</p></article>
      <article class="card"><h3>Target 95%</h3><p>${s.target_mutu} menggunakan case method/team-based project</p></article>
    `;

    document.getElementById('metodeGrid').innerHTML = d.metode_pembelajaran.map(m => `
      <article class="card"><h3>${m.nama}</h3><p>${m.deskripsi}</p></article>
    `).join('');

    document.getElementById('integrasiBlock').innerHTML = `
      <p>${d.integrasi_riset.deskripsi}</p>
      <p style="margin-top:12px;"><strong>Contoh:</strong> ${d.integrasi_riset.contoh}</p>
    `;

    document.getElementById('teknikList').innerHTML = d.penilaian.teknik.map(t => `<span class="pill">${t}</span>`).join('');
    document.getElementById('instrumenList').innerHTML = d.penilaian.instrumen.map(i => `<span class="pill">${i}</span>`).join('');
    document.getElementById('penilaianPrinsip').textContent = d.penilaian.prinsip;

    document.getElementById('mbkmCard').innerHTML = `
      <h3>MBKM (Merdeka Belajar Kampus Merdeka)</h3>
      <p>${d.mbkm.deskripsi}</p>
      <p style="margin-top:10px;"><strong>Contoh:</strong> ${d.mbkm.contoh}</p>
    `;
    document.getElementById('dokumentasiCard').innerHTML = `
      <h3>Dokumentasi via Portal INSPIRE</h3>
      <p>${d.dokumentasi.deskripsi}</p>
      <ul class="dok-ul">${d.dokumentasi.item.map(i => `<li>${i}</li>`).join('')}</ul>
    `;
  } catch (e) {
    console.error('Gagal memuat data pendidikan:', e);
  }
}
loadPendidikan();
