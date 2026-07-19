async function loadProfil() {
  try {
    const res = await fetch('js/data/profil.json');
    const d = await res.json();

    document.getElementById('sejarahText').textContent = d.sejarah;
    document.getElementById('visiText').textContent = `"${d.visi}"`;
    document.getElementById('misiList').innerHTML = d.misi.map(m => `<li>${m}</li>`).join('');

    document.getElementById('tujuanDesc').textContent = d.tujuan.deskripsi;
    document.getElementById('cplGrid').innerHTML = d.tujuan.cpl.map(c => `
      <article class="card"><p style="color:var(--navy);font-weight:500;">${c}</p></article>
    `).join('');
    document.getElementById('targetList').innerHTML = d.tujuan.target_terukur.map(t => `
      <div class="kegiatan-item"><p>✅ ${t}</p></div>
    `).join('');

    document.getElementById('keselarasanStepper').innerHTML = d.keselarasan_vertikal.map((k, i) => `
      <div class="step-item">
        <div class="step-marker ${i === d.keselarasan_vertikal.length - 1 ? 'berjalan' : 'selesai'}">${i + 1}</div>
        <div class="step-body">
          <h4>Level ${k.level}</h4>
          <p>"${k.visi}"<br><em style="font-size:0.8rem;">— ${k.sumber}</em></p>
        </div>
      </div>
    `).join('');

    const s = d.struktur_organisasi;
    document.getElementById('strukturDasar').textContent = s.dasar_hukum;
    document.getElementById('pimpinanTable').innerHTML = `
      <thead><tr><th>Jabatan</th><th>Nama</th><th>Tugas Pokok</th></tr></thead>
      <tbody>
        ${s.pimpinan.map(p => `
          <tr><td><strong>${p.jabatan}</strong></td><td>${p.nama || '—'}</td><td>${p.tupoksi}</td></tr>
        `).join('')}
      </tbody>`;
    document.getElementById('strukturJurusan').textContent = s.jurusan + ' ' + s.senat;

    document.getElementById('renstraGrid').innerHTML = `
      <article class="card"><h3>Jangka Panjang</h3><p>${d.renstra.jangka_panjang}</p></article>
      <article class="card"><h3>Jangka Menengah</h3><p>${d.renstra.jangka_menengah}</p></article>
      <article class="card"><h3>Jangka Pendek</h3><p>${d.renstra.jangka_pendek}</p></article>
    `;
  } catch (e) {
    console.error('Gagal memuat data profil:', e);
  }
}
loadProfil();
