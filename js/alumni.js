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

    function kartu(p, i, elId) {
      const fotoUrl = fotoOverride[i] || (p.foto && p.foto.trim() ? p.foto : '');
      const inisial = p.nama.replace(/\[.*?\]/g, '').split(/\s+/).filter(w => /^[A-Za-z]/.test(w)).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '—';
      const foto = fotoUrl
        ? `<div class="pengurus-foto"><img src="${fotoUrl}" alt="${p.nama}" loading="lazy"></div>`
        : `<div class="pengurus-foto pengurus-foto-empty"><span>${inisial}</span></div>`;
      return `
        <article class="pengurus-card bagan-card" id="${elId}">
          ${foto}
          <div class="pengurus-body">
            <span class="pengurus-peran">${p.peran}</span>
            <h3 class="pengurus-nama">${p.nama}</h3>
          </div>
        </article>`;
    }

    // Petakan pengurus + index aslinya
    const withIdx = data.pengurus.map((p, i) => ({ p, i }));
    const cari = (fn) => withIdx.filter(x => fn(x.p));
    const lvl1 = cari(p => p.level === 1);
    const lvl2 = cari(p => p.level === 2);
    const kiri = cari(p => p.cabang === 'kiri').sort((a, b) => a.p.level - b.p.level);
    const kanan = cari(p => p.cabang === 'kanan').sort((a, b) => a.p.level - b.p.level);
    const lainnya = cari(p => p.level >= 5);

    if (lvl1.length || lvl2.length) {
      let html = '<div class="bagan-struktur"><svg class="bagan-svg" id="baganSvg"></svg><div class="bagan-layer">';

      const relasi = []; // {dari, ke} pasangan id kartu untuk digambar garis

      // Level 1 — Ketua Umum
      if (lvl1.length) {
        html += `<div class="bagan-level">${lvl1.map(x => kartu(x.p, x.i, `bagan-${x.i}`)).join('')}</div>`;
      }
      // Level 2 — Ketua Harian
      if (lvl2.length) {
        html += `<div class="bagan-level">${lvl2.map(x => kartu(x.p, x.i, `bagan-${x.i}`)).join('')}</div>`;
        lvl1.forEach(a => lvl2.forEach(b => relasi.push([`bagan-${a.i}`, `bagan-${b.i}`, 'lurus'])));
      }
      // Percabangan kiri (Sekretariat) & kanan (Keuangan)
      if (kiri.length || kanan.length) {
        html += '<div class="bagan-cabang">';
        html += '<div class="bagan-kolom">' + kiri.map(x => kartu(x.p, x.i, `bagan-${x.i}`)).join('') + '</div>';
        html += '<div class="bagan-kolom">' + kanan.map(x => kartu(x.p, x.i, `bagan-${x.i}`)).join('') + '</div>';
        html += '</div>';
        const induk = lvl2.length ? lvl2 : lvl1;
        // induk → item pertama tiap kolom (cabang)
        if (kiri.length) induk.forEach(a => relasi.push([`bagan-${a.i}`, `bagan-${kiri[0].i}`, 'cabang']));
        if (kanan.length) induk.forEach(a => relasi.push([`bagan-${a.i}`, `bagan-${kanan[0].i}`, 'cabang']));
        // dalam kolom: berurutan lurus ke bawah
        for (let k = 1; k < kiri.length; k++) relasi.push([`bagan-${kiri[k-1].i}`, `bagan-${kiri[k].i}`, 'lurus']);
        for (let k = 1; k < kanan.length; k++) relasi.push([`bagan-${kanan[k-1].i}`, `bagan-${kanan[k].i}`, 'lurus']);
      }
      if (lainnya.length) {
        html += `<div class="bagan-level">${lainnya.map(x => kartu(x.p, x.i, `bagan-${x.i}`)).join('')}</div>`;
      }
      html += '</div></div>';
      pengurusGrid.className = '';
      pengurusGrid.innerHTML = html;

      // Gambar garis komando setelah kartu benar-benar ter-render di layout
      requestAnimationFrame(() => gambarGarisKomando(relasi));
      window.addEventListener('resize', debounce(() => gambarGarisKomando(relasi), 200));
    } else {
      pengurusGrid.className = 'pengurus-grid';
      pengurusGrid.innerHTML = withIdx.map(x => kartu(x.p, x.i, `bagan-${x.i}`)).join('');
    }

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

// ── Penggambar Garis Komando (SVG, elbow membulat, presisi ke posisi kartu asli) ──
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function gambarGarisKomando(relasi) {
  const svg = document.getElementById('baganSvg');
  const wrap = document.querySelector('.bagan-struktur');
  if (!svg || !wrap || !relasi.length) return;

  const wrapBox = wrap.getBoundingClientRect();
  svg.setAttribute('width', wrapBox.width);
  svg.setAttribute('height', wrapBox.height);
  svg.setAttribute('viewBox', `0 0 ${wrapBox.width} ${wrapBox.height}`);

  const R = 14; // radius sudut membulat
  let defs = `<defs>
    <marker id="baganDot" markerWidth="8" markerHeight="8" refX="4" refY="4"><circle cx="4" cy="4" r="3.5" fill="var(--teal)"/></marker>
  </defs>`;

  const paths = relasi.map(([dariId, keId, tipe]) => {
    const dari = document.getElementById(dariId);
    const ke = document.getElementById(keId);
    if (!dari || !ke) return '';
    const dBox = dari.getBoundingClientRect();
    const kBox = ke.getBoundingClientRect();
    const x1 = dBox.left + dBox.width / 2 - wrapBox.left;
    const y1 = dBox.bottom - wrapBox.top;
    const x2 = kBox.left + kBox.width / 2 - wrapBox.left;
    const y2 = kBox.top - wrapBox.top;

    let d;
    if (Math.abs(x1 - x2) < 2) {
      // lurus vertikal
      d = `M ${x1} ${y1} L ${x2} ${y2}`;
    } else {
      // elbow dengan sudut membulat: turun → belok → turun
      const midY = y1 + (y2 - y1) / 2;
      const dir = x2 > x1 ? 1 : -1;
      d = `M ${x1} ${y1}
           L ${x1} ${midY - R}
           Q ${x1} ${midY} ${x1 + dir * R} ${midY}
           L ${x2 - dir * R} ${midY}
           Q ${x2} ${midY} ${x2} ${midY + R}
           L ${x2} ${y2}`;
    }
    return `<path d="${d}" class="bagan-garis" marker-end="url(#baganDot)"/>`;
  }).join('');

  svg.innerHTML = defs + paths;
}

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
