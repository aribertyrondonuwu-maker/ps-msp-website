// ── Pengurus & Kegiatan (statis dari JSON) ──────────────────────────────
async function loadPengurusKegiatan() {
  try {
    const res = await fetch('js/data/alumni-pengurus.json');
    const data = await res.json();

    const narasi = document.getElementById('ikatanAlumniNarasi');
    if (narasi && data.ikatan_alumni && Array.isArray(data.ikatan_alumni.deskripsi)) {
      narasi.innerHTML = data.ikatan_alumni.deskripsi.map(p => `<p>${p}</p>`).join('');
    }

    // Ambil override foto pengurus dari Supabase (diunggah superadmin)
    let fotoOverride = {};
    if (window.sbClient) {
      try {
        const { data: settings } = await window.sbClient.from('site_settings').select('key,value').like('key', 'pengurus_foto:%');
        (settings || []).forEach(s => {
          const idx = parseInt(s.key.replace('pengurus_foto:', ''), 10);
          if (!isNaN(idx) && s.value) fotoOverride[idx] = s.value;
        });
      } catch (e) { /* diam */ }
    }

    const pengurusGrid = document.getElementById('pengurusGrid');
    pengurusGrid.innerHTML = data.pengurus.map((p, i) => {
      const fotoUrl = fotoOverride[i] || (p.foto && p.foto.trim() ? p.foto : '');
      const inisial = p.nama.replace(/\[.*?\]/g, '').split(/\s+/).filter(w => /^[A-Za-z]/.test(w)).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '—';
      const foto = fotoUrl
        ? `<div class="pengurus-foto"><img src="${fotoUrl}" alt="${p.nama}" loading="lazy"></div>`
        : `<div class="pengurus-foto pengurus-foto-empty"><span>${inisial}</span></div>`;
      return `
        <article class="pengurus-card">
          ${foto}
          <div class="pengurus-body">
            <span class="pengurus-peran">${p.peran}</span>
            <h3 class="pengurus-nama">${p.nama}</h3>
          </div>
        </article>`;
    }).join('');

    const kegiatanList = document.getElementById('kegiatanList');
    kegiatanList.innerHTML = data.kegiatan.map(k => `
      <div class="kegiatan-item">
        ${k.tahun ? `<div class="tahun">${k.tahun}</div>` : ''}
        <h4>${k.judul}</h4>
        <p>${k.deskripsi}</p>
      </div>
    `).join('');
  } catch (e) {
    console.error('Gagal memuat data alumni:', e);
  }
}
loadPengurusKegiatan();

// ── Diskusi / Komentar ───────────────────────────────────────────────────
// MODE PRATINJAU: berjalan in-memory (tidak permanen) sampai Supabase
// dihubungkan. Setelah setup Supabase (lihat references/tech-stack.md,
// tabel `alumni_diskusi`), ganti fungsi submitDiskusi() & loadDiskusi()
// di bawah untuk memanggil window.sbClient.from('alumni_diskusi')... dst.

// ── Preview percakapan alumni (ringkas) di halaman Alumni ──
// Forum lengkap ada di forum-alumni.html
async function loadDiskusiPreview() {
  const prev = document.getElementById('forumPreview');
  if (!prev) return;
  if (window.sbClient) {
    try {
      const { data, error } = await window.sbClient
        .from('alumni_diskusi')
        .select('nama, pesan, created_at')
        .eq('approved', true)
        .order('created_at', { ascending: false })
        .limit(2);
      if (error) throw error;
      if (data && data.length) {
        prev.innerHTML = '<p class="forum-cta-label">Percakapan terbaru:</p>' + data.map(d =>
          `<div class="forum-cta-item"><strong>${escapeHtml(d.nama)}</strong>: ${escapeHtml(d.pesan).slice(0, 90)}${d.pesan.length > 90 ? '…' : ''}</div>`
        ).join('');
        return;
      }
    } catch (e) { /* diam */ }
  }
  prev.innerHTML = '<p class="muted">Jadilah yang pertama memulai percakapan di forum alumni.</p>';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : str;
  return div.innerHTML;
}

loadDiskusiPreview();

// ── Logo Ikatan Alumni (diunggah superadmin via Supabase) ──
async function loadAlumniLogo() {
  const box = document.getElementById('alumniLogo');
  if (!box) return;
  let url = '';
  if (window.sbClient) {
    try {
      const { data } = await window.sbClient.from('site_settings').select('value').eq('key', 'alumni_logo').maybeSingle();
      if (data && data.value) url = data.value;
    } catch (e) { /* diam */ }
  }
  box.innerHTML = url
    ? `<img src="${url}" alt="Logo Ikatan Alumni PS MSP">`
    : `<span class="logo-placeholder">Logo Ikatan Alumni<br>(dapat ditambahkan admin)</span>`;
}
loadAlumniLogo();

// ── Scroll-spy sub-menu: soroti section aktif ──
(function submenuSpy() {
  const links = Array.from(document.querySelectorAll('.submenu-link[href^="#"]'));
  if (!links.length) return;
  const map = links.map(a => ({ link: a, sec: document.querySelector(a.getAttribute('href')) })).filter(x => x.sec);

  function onScroll() {
    const y = window.scrollY + 120;
    let current = map[0];
    for (const m of map) { if (m.sec.offsetTop <= y) current = m; }
    links.forEach(l => l.classList.remove('active'));
    if (current) current.link.classList.add('active');
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // smooth scroll dengan offset agar tidak tertutup submenu sticky
  links.forEach(a => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
})();
