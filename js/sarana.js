async function loadSarana() {
  try {
    const res = await fetch('js/data/sarana.json');
    const data = await res.json();
    const r = data.ringkasan;

    const ringkasanEl = document.getElementById('ringkasanSaranaGrid');
    if (ringkasanEl) {
      ringkasanEl.innerHTML = `
        <article class="card"><h3>${r.jumlah_lab_aktif} Laboratorium Aktif</h3><p>${r.dasar_hukum}</p></article>
        <article class="card"><h3>Investasi Sarana</h3><p>${r.investasi_rata_rata_tahunan}</p></article>
        <article class="card"><h3>Kepuasan Mahasiswa</h3><p>${r.kepuasan_mahasiswa}</p></article>
      `;
    }

    function relevansiBadge(rel) {
      if (!rel) return '';
      const cls = rel.toLowerCase().includes('sangat') ? 'badge-relevan-tinggi' : 'badge-relevan';
      return `<span class="lab-badge ${cls}">${rel}</span>`;
    }

    function labImage(l) {
      if (l.gambar && l.gambar.trim()) {
        return `<div class="lab-photo"><img src="${l.gambar}" alt="${l.nama}" loading="lazy"></div>`;
      }
      return `<div class="lab-photo lab-photo-empty"><span>Foto lab<br>(dapat ditambahkan admin)</span></div>`;
    }

    function docLink(l) {
      if (l.url_dokumen && l.url_dokumen.trim()) {
        return `<a href="${l.url_dokumen}" target="_blank" rel="noopener" class="card-link">Lihat dokumen/bukti →</a>`;
      }
      return '';
    }

    const labGrid = document.getElementById('labGrid');
    if (labGrid) {
      labGrid.innerHTML = data.laboratorium.map(l => `
        <article class="card lab-card" style="${l.highlight ? 'border:2px solid var(--teal);' : ''}">
          ${labImage(l)}
          <div class="lab-card-body">
            <h3>${l.highlight ? '⭐ ' : ''}${l.no}. ${l.nama}</h3>
            <p class="lab-kepala"><strong>Kepala:</strong> ${l.kepala}</p>
            <p>${l.fungsi}</p>
            ${relevansiBadge(l.relevansi)}
            ${docLink(l)}
          </div>
        </article>
      `).join('');
    }

    const labUnivGrid = document.getElementById('labUnivGrid');
    if (labUnivGrid && Array.isArray(data.lab_universitas)) {
      labUnivGrid.innerHTML = data.lab_universitas.map(l => `
        <article class="card lab-card">
          ${labImage(l)}
          <div class="lab-card-body">
            <h3>${l.nama}</h3>
            <p class="lab-kepala"><strong>Dasar hukum:</strong> ${l.dasar_hukum}</p>
            <p>${l.deskripsi}</p>
            ${docLink(l)}
          </div>
        </article>
      `).join('');
    }

    const sopList = document.getElementById('sopList');
    if (sopList) {
      sopList.innerHTML = data.standar_pengelolaan.map(s => `
        <div class="kegiatan-item"><p>${s}</p></div>
      `).join('');
    }
  } catch (e) {
    console.error('Gagal memuat data sarana:', e);
  }
}
loadSarana();
