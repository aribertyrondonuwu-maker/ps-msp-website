async function loadPenelitianMinat() {
  try {
    const res = await fetch('js/data/penelitian-minat.json');
    const d = await res.json();

    document.getElementById('penelitianPengantar').textContent = d.pengantar;

    const s = d.statistik;
    document.getElementById('statPenelitianGrid').innerHTML = `
      <article class="card"><h3>${s.total_penelitian}</h3><p>Total penelitian DTPS</p></article>
      <article class="card"><h3>${s.publikasi_internasional}</h3><p>Publikasi internasional bereputasi</p></article>
      <article class="card"><h3>${s.sitasi}</h3><p>Artikel tersitasi</p></article>
      <article class="card"><h3>Konsentrasi Riset</h3><p>${s.konsentrasi}</p></article>
    `;

    document.getElementById('klasterGrid').innerHTML = d.klaster.map(k => `
      <article class="klaster-card${k.inti ? ' inti' : ''}">
        <div class="klaster-no">${k.no}</div>
        <div class="klaster-body">
          <h3>${k.inti ? '⭐ ' : ''}${k.nama}</h3>
          <p class="klaster-fokus">${k.fokus}</p>
          <p class="klaster-contoh"><strong>Contoh kegiatan:</strong> ${k.contoh}</p>
          <p class="klaster-lab">🔬 ${k.lab}</p>
        </div>
      </article>
    `).join('');

    document.getElementById('roadmapStepper').innerHTML = d.roadmap.map((r, i) => {
      const status = r.tahun <= '2025' ? 'selesai' : (r.tahun === '2026' ? 'berjalan' : 'menunggu');
      return `
      <div class="step-item">
        <div class="step-marker ${status}">${r.tahun.slice(2)}</div>
        <div class="step-body">
          <h4>${r.tahun} — ${r.fase}</h4>
          <p><strong>Fokus:</strong> ${r.fokus}<br><strong>Hasil diharapkan:</strong> ${r.hasil}</p>
        </div>
      </div>`;
    }).join('');
  } catch (e) {
    console.error('Gagal memuat data penelitian:', e);
  }
}
loadPenelitianMinat();
