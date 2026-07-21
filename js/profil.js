async function loadProfil() {
  try {
    const res = await fetch('js/data/profil.json');
    const d = await res.json();

    // Sejarah lengkap terstruktur
    const sejarahEl = document.getElementById('sejarahLengkap');
    if (sejarahEl && d.sejarah_lengkap) {
      const sl = d.sejarah_lengkap;
      let html = '';
      if (sl.pengantar) html += `<p class="sejarah-pengantar">${sl.pengantar}</p>`;
      (sl.bagian || []).forEach(b => {
        html += `<h3 class="sejarah-subjudul">${b.judul}</h3>`;
        (b.paragraf || []).forEach(p => { html += `<p>${p}</p>`; });
        if (b.daftar_intro) html += `<p>${b.daftar_intro}</p>`;
        if (Array.isArray(b.daftar) && b.daftar.length) {
          html += '<ul class="sejarah-list">' + b.daftar.map(i => `<li>${i}</li>`).join('') + '</ul>';
        }
        (b.paragraf_lanjut || []).forEach(p => { html += `<p>${p}</p>`; });
      });
      sejarahEl.innerHTML = html;
    } else if (sejarahEl) {
      // fallback ke sejarah lama bila struktur baru tidak ada
      sejarahEl.innerHTML = `<p>${d.sejarah || ''}</p>${d.sejarah_ps ? `<p>${d.sejarah_ps}</p>` : ''}`;
    }

    if (d.sambutan_korprodi) {
      const s = d.sambutan_korprodi;
      let fotoHtml = '';
      if (window.sbClient) {
        try {
          const { data: f } = await window.sbClient.from('site_settings').select('value').eq('key', 'korprodi_foto').maybeSingle();
          if (f && f.value) fotoHtml = `<img src="${f.value}" alt="${s.nama}" class="sambutan-foto-inline">`;
        } catch (e) { /* skip */ }
      }
      document.getElementById('sambutanCard').innerHTML = `
        ${fotoHtml}
        <div>
          <p class="sambutan-isi">"${s.isi}"</p>
          <div class="sambutan-penutup">
            <strong>${s.nama}</strong><br>
            <span class="muted">${s.jabatan}</span>
          </div>
        </div>`;
    }
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

    if (d.dokumen_resmi) {
      document.getElementById('dokumenResmiList').innerHTML = d.dokumen_resmi.map(doc => `
        <a href="${doc.url}" target="_blank" rel="noopener" class="dok-card">
          <div class="dok-thumb">
            ${doc.gambar
              ? `<img src="${doc.gambar}" alt="${doc.nama}" loading="lazy" onerror="this.parentElement.classList.add('no-img');this.remove();">`
              : ''}
            <span class="dok-thumb-fallback">📄</span>
          </div>
          <div class="dok-info">
            <h4>${doc.nama}</h4>
            ${doc.keterangan ? `<p>${doc.keterangan}</p>` : ''}
            <span class="dok-download">Unduh dokumen →</span>
          </div>
        </a>
      `).join('');
    }
  } catch (e) {
    console.error('Gagal memuat data profil:', e);
  }
}
loadProfil();
