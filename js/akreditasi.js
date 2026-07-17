async function loadAkreditasi() {
  try {
    const res = await fetch('js/data/akreditasi.json');
    const data = await res.json();
    const { identitas, progres, tahapan, faq, tautan } = data;

    // Status banner
    document.getElementById('statusBanner').innerHTML = `
      <div class="status-main">
        <span class="badge-status">Tahap Sekarang: ${progres.tahap_sekarang}</span>
        <h3>Status Terkini: ${identitas.status_saat_ini} → Target ${identitas.target}</h3>
        <p>${progres.catatan_terbaru}</p>
        <p class="muted" style="font-size:0.78rem;margin-top:8px;">Update: ${new Date(progres.update_pada).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>
      <div class="status-stats">
        <div class="stat"><span class="num">${identitas.jumlah_indikator}</span><span class="label">Indikator IAPS 1.0</span></div>
        <div class="stat"><span class="num">${identitas.status_saat_ini}</span><span class="label">Akreditasi Saat Ini</span></div>
      </div>
    `;

    // Stepper
    document.getElementById('stepperList').innerHTML = tahapan.map(t => {
      const icon = t.status === 'selesai' ? '✓' : t.no;
      return `
        <div class="step-item">
          <div class="step-marker ${t.status}">${icon}</div>
          <div class="step-body">
            <h4>${t.nama}<span class="tag ${t.status}">${t.status}</span></h4>
            <p>${t.deskripsi}</p>
          </div>
        </div>`;
    }).join('');

    // FAQ
    document.getElementById('faqList').innerHTML = faq.map(f => `
      <div class="faq-item">
        <h4>${f.q}</h4>
        <p>${f.a}</p>
      </div>
    `).join('');

    // Tautan
    document.getElementById('tautanGrid').innerHTML = tautan.map(t => `
      <a href="${t.url}" target="_blank" class="card" style="display:block;">
        <h3>${t.label}</h3>
        <p class="card-link">Buka situs →</p>
      </a>
    `).join('');
  } catch (e) {
    console.error('Gagal memuat data akreditasi:', e);
  }
}
loadAkreditasi();
