async function loadMutu() {
  try {
    const res = await fetch('js/data/mutu.json');
    const data = await res.json();
    const r = data.ringkasan;

    document.getElementById('ringkasanMutuGrid').innerHTML = `
      <article class="card"><h3>Kebijakan Mutu</h3><p>${r.kebijakan_mutu}</p></article>
      <article class="card"><h3>Sasaran Mutu</h3><p>${r.sasaran_mutu}</p></article>
      <article class="card"><h3>Standar ISO</h3><p>${r.standar_iso}</p></article>
      <article class="card"><h3>Audit Mutu Internal (AMI)</h3><p>${r.siklus_ami}</p></article>
    `;

    document.getElementById('ppeppStepper').innerHTML = data.siklus_ppepp.map((s, i) => `
      <div class="step-item">
        <div class="step-marker selesai">${i + 1}</div>
        <div class="step-body">
          <h4>${s.tahap}</h4>
          <p>${s.dokumen} — <em>${s.nomor}</em></p>
        </div>
      </div>
    `).join('');

    const table = document.getElementById('dokumenTable');
    table.innerHTML = `
      <thead><tr><th>Nama Dokumen</th><th>Nomor</th><th>Tanggal Terbit</th></tr></thead>
      <tbody>
        ${data.dokumen_pedoman.map(d => `
          <tr><td>${d.nama}</td><td>${d.nomor}</td><td>${d.tanggal}</td></tr>
        `).join('')}
      </tbody>`;

    document.getElementById('mutuTautanGrid').innerHTML = data.tautan.map(t => `
      <a href="${t.url}" target="_blank" class="card" style="display:block;">
        <h3>${t.label}</h3><p class="card-link">Buka situs →</p>
      </a>
    `).join('');
  } catch (e) {
    console.error('Gagal memuat data mutu:', e);
  }
}
loadMutu();
