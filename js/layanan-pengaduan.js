async function loadLayananPengaduan() {
  try {
    const res = await fetch('js/data/layanan-pengaduan.json');
    const data = await res.json();

    const ringkasanEl = document.getElementById('pengaduanRingkasan');
    if (ringkasanEl) ringkasanEl.textContent = data.ringkasan.pengantar;

    const targetEl = document.getElementById('pengaduanTargetWaktu');
    if (targetEl) targetEl.textContent = data.ringkasan.target_waktu_utama;

    // Kartu kanal pengaduan
    const kanalGrid = document.getElementById('pengaduanKanalGrid');
    if (kanalGrid) {
      kanalGrid.innerHTML = data.kanal.map(k => `
        <article class="card">
          <h3>${k.nama}</h3>
          <p>${k.untuk}</p>
          <p class="muted small-note"><strong>Cara akses:</strong> ${k.cara_akses}</p>
          <p class="muted small-note"><strong>Waktu respons:</strong> ${k.waktu_respons}</p>
          <p class="muted small-note"><strong>Dasar hukum:</strong> ${k.dasar_hukum}</p>
          <a href="${k.url}" target="_blank" rel="noopener" class="card-link">Buka kanal &rarr;</a>
        </article>
      `).join('');
    }

    // Alur pengaduan (stepper, mengikuti pola halaman Penjaminan Mutu)
    const stepper = document.getElementById('pengaduanStepper');
    if (stepper) {
      stepper.innerHTML = data.alur.map((s, i) => `
        <div class="step-item">
          <div class="step-marker selesai">${i + 1}</div>
          <div class="step-body">
            <h4>${s.tahap}</h4>
            <p>${s.keterangan}</p>
          </div>
        </div>
      `).join('');
    }

    // Tabel penanggung jawab
    const pjTable = document.getElementById('pengaduanPJTable');
    if (pjTable) {
      pjTable.innerHTML = `
        <thead><tr><th>Peran</th><th>Tugas</th></tr></thead>
        <tbody>
          ${data.penanggung_jawab.map(p => `<tr><td><strong>${p.peran}</strong></td><td>${p.tugas}</td></tr>`).join('')}
        </tbody>`;
    }

    // Ruang lingkup
    const lingkupList = document.getElementById('pengaduanLingkupList');
    if (lingkupList) {
      lingkupList.innerHTML = data.ruang_lingkup.map(l => `<li>${l}</li>`).join('');
    }

    // Kontak langsung
    const kontak = data.kontak_langsung;
    const kontakEl = document.getElementById('pengaduanKontakLangsung');
    if (kontakEl && kontak) {
      kontakEl.innerHTML = `
        <p><strong>Email:</strong> <a href="mailto:${kontak.email}">${kontak.email}</a></p>
        <p><strong>WhatsApp:</strong> ${kontak.whatsapp}</p>
        <p class="muted small-note">${kontak.catatan}</p>
      `;
    }
  } catch (e) {
    console.error('Gagal memuat data layanan pengaduan:', e);
  }
}
loadLayananPengaduan();
