// Navbar solid saat scroll
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
});

// Counter animasi untuk strip statistik
function animateCount(el) {
  const target = parseInt(el.dataset.count, 10);
  const suffix = el.dataset.suffix || '';
  const duration = 1200;
  const start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const val = Math.floor(progress * target);
    el.textContent = val + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
const statObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCount(entry.target);
      statObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.4 });
document.querySelectorAll('.stat-num').forEach(el => statObserver.observe(el));

// Render kartu dosen dari js/data/dosen.json (buat file ini saat mengerjakan
// halaman Dosen — lihat references/dosen-data.md untuk 16 nama terverifikasi)
async function renderDosen() {
  const grid = document.getElementById('dosenGrid');
  if (!grid) return;
  try {
    const res = await fetch('js/data/dosen.json');
    if (!res.ok) throw new Error('belum ada dosen.json');
    const dosen = await res.json();

    let fotoMap = {};
    if (window.sbClient) {
      try {
        const { data } = await window.sbClient.from('site_settings').select('key,value').like('key', 'dosen_foto:%');
        (data || []).forEach(row => { fotoMap[row.key.replace('dosen_foto:', '')] = row.value; });
      } catch (e) { /* diam saja, pakai avatar inisial */ }
    }

    grid.innerHTML = dosen.map(d => `
      <a class="dosen-card" href="dosen-detail.html?id=${d.id}">
        ${fotoMap[d.id]
          ? `<img class="dosen-photo" src="${fotoMap[d.id]}" alt="${d.nama}" style="object-fit:cover;">`
          : `<div class="dosen-photo">${d.inisial || d.nama.split(' ').map(w => w[0]).slice(0,2).join('')}</div>`}
        <div class="dosen-info">
          <h4>${d.nama}</h4>
          <p>${d.keahlian}</p>
        </div>
      </a>
    `).join('');
  } catch (e) {
    grid.innerHTML = '<p class="muted">[DATA DIPERLUKAN: js/data/dosen.json belum dibuat — lihat references/dosen-data.md]</p>';
  }
}
renderDosen();

// Terapkan foto header (hero) per halaman jika admin sudah upload (site_settings key hero:{halaman})
async function applyHeroImage(pageKey) {
  const heroEl = document.querySelector('.hero, .page-hero');
  if (!heroEl || !window.sbClient) return;
  try {
    const { data } = await window.sbClient.from('site_settings').select('value').eq('key', `hero:${pageKey}`).maybeSingle();
    if (data && data.value) {
      heroEl.style.backgroundImage = `linear-gradient(160deg, rgba(10,37,64,0.75), rgba(15,118,110,0.75)), url('${data.value}')`;
      heroEl.style.backgroundSize = 'cover';
      heroEl.style.backgroundPosition = 'center';
    }
  } catch (e) { /* pakai gradient default */ }
}

document.getElementById('year').textContent = new Date().getFullYear();

// Terapkan foto header kustom jika admin sudah mengunggahnya untuk halaman ini
const _pageKey = document.body.dataset.page;
if (_pageKey) applyHeroImage(_pageKey);

// Render galeri dari js/data/galeri.json (placeholder sampai foto/video asli tersedia)
async function renderGaleri() {
  const grid = document.getElementById('galeriGrid');
  if (!grid) return;
  try {
    const res = await fetch('js/data/galeri.json');
    const data = await res.json();
    let items = data.item;

    // Gabungkan item live dari admin (tabel Supabase `galeri`)
    if (window.sbClient) {
      try {
        const { data: liveItems } = await window.sbClient.from('galeri').select('*').order('created_at', { ascending: false });
        if (liveItems && liveItems.length) {
          const mapped = liveItems.map(g => ({ status: 'live', tipe: g.tipe, kategori: g.kategori, caption: g.caption, url: g.url }));
          items = [...mapped, ...items];
        }
      } catch (e) { /* pakai data statis saja */ }
    }

    grid.innerHTML = items.map(g => {
      if (g.status === 'live' && g.tipe === 'foto') {
        return `<div class="galeri-item"><img src="${g.url}" alt="${g.caption}" loading="lazy"></div>`;
      }
      if (g.status === 'live' && g.tipe === 'video') {
        return `<div class="galeri-item"><iframe src="${g.url}" loading="lazy" style="width:100%;height:100%;border:0;" allowfullscreen></iframe></div>`;
      }
      const icon = g.tipe === 'video' ? '🎬' : '📷';
      return `
        <div class="galeri-item">
          <div class="galeri-placeholder">
            <span class="icon">${icon}</span>
            <span class="kategori">${g.kategori}</span>
            <span class="caption">${g.caption}</span>
          </div>
        </div>`;
    }).join('');
  } catch (e) {
    grid.innerHTML = '<p class="muted">[DATA DIPERLUKAN: js/data/galeri.json belum tersedia]</p>';
  }
}
renderGaleri();

// Render Berita & Pengumuman dari Supabase (tabel `berita`, hanya yang published)
async function renderBerita() {
  const grid = document.getElementById('beritaGrid');
  if (!grid) return;
  if (!window.sbClient) {
    grid.innerHTML = '<article class="card"><p class="muted">Belum ada berita dipublikasikan.</p></article>';
    return;
  }
  try {
    const { data, error } = await window.sbClient
      .from('berita')
      .select('id, judul, kategori, konten, tanggal_publish')
      .eq('published', true)
      .order('tanggal_publish', { ascending: false })
      .limit(6);
    if (error) throw error;
    if (!data.length) {
      grid.innerHTML = '<article class="card"><p class="muted">Belum ada berita dipublikasikan.</p></article>';
      return;
    }
    grid.innerHTML = data.map(b => `
      <a href="berita-detail.html?id=${b.id}" class="card" style="display:block;">
        ${b.kategori ? `<p class="card-link" style="margin-bottom:8px;">${b.kategori}</p>` : ''}
        <h3>${b.judul}</h3>
        <p>${(b.konten || '').replace(/<[^>]+>/g, '').slice(0, 140)}${b.konten && b.konten.length > 140 ? '…' : ''}</p>
        <p class="muted" style="font-size:0.78rem;margin-top:10px;">${new Date(b.tanggal_publish).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </a>
    `).join('');
  } catch (e) {
    console.error('Gagal memuat berita:', e);
    grid.innerHTML = '<article class="card"><p class="muted">Belum ada berita dipublikasikan.</p></article>';
  }
}
renderBerita();

// Highlight beranda: Berita Terbaru + Pengumuman (dipisah berdasarkan kategori)
async function renderHighlight() {
  const beritaList = document.getElementById('highlightBeritaList');
  const pengumumanList = document.getElementById('highlightPengumumanList');
  if (!beritaList && !pengumumanList) return;
  if (!window.sbClient) {
    if (beritaList) beritaList.innerHTML = '<p class="muted">Belum ada berita.</p>';
    if (pengumumanList) pengumumanList.innerHTML = '<p class="muted">Belum ada pengumuman.</p>';
    return;
  }
  try {
    const { data, error } = await window.sbClient
      .from('berita')
      .select('id, judul, kategori, konten, tanggal_publish')
      .eq('published', true)
      .order('tanggal_publish', { ascending: false })
      .limit(20);
    if (error) throw error;

    const pengumuman = (data || []).filter(b => b.kategori === 'Pengumuman').slice(0, 5);
    const berita = (data || []).filter(b => b.kategori !== 'Pengumuman').slice(0, 4);

    if (beritaList) {
      beritaList.innerHTML = berita.length ? berita.map(b => `
        <a href="berita-detail.html?id=${b.id}" class="highlight-item">
          <div class="highlight-item-body">
            <span class="highlight-kat">${b.kategori || 'Berita'}</span>
            <h4>${b.judul}</h4>
            <span class="highlight-tgl">${new Date(b.tanggal_publish).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
        </a>
      `).join('') : '<p class="muted">Belum ada berita dipublikasikan.</p>';
    }

    if (pengumumanList) {
      pengumumanList.innerHTML = pengumuman.length ? pengumuman.map(b => {
        const t = new Date(b.tanggal_publish);
        return `
        <a href="berita-detail.html?id=${b.id}" class="pengumuman-item">
          <div class="pengumuman-date">
            <span class="pd-day">${t.getDate()}</span>
            <span class="pd-mon">${t.toLocaleDateString('id-ID', { month: 'short' })}</span>
          </div>
          <span class="pengumuman-judul">${b.judul}</span>
        </a>`;
      }).join('') : '<p class="muted">Belum ada pengumuman.</p>';
    }
  } catch (e) {
    console.error('Gagal memuat highlight:', e);
    if (beritaList) beritaList.innerHTML = '<p class="muted">Belum ada berita.</p>';
    if (pengumumanList) pengumumanList.innerHTML = '<p class="muted">Belum ada pengumuman.</p>';
  }
}
renderHighlight();

// Media sosial (alamat diatur superadmin, disimpan di site_settings key sosmed:{platform})
const SOSMED_ICONS = {
  facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.49 0-1.96.93-1.96 1.89v2.25h3.32l-.53 3.49h-2.79V24C19.61 23.1 24 18.1 24 12.07z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.31-1.46.72-2.13 1.38C1.35 2.68.94 3.35.63 4.14.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.31.79.72 1.46 1.38 2.13.67.66 1.34 1.07 2.13 1.38.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56.79-.31 1.46-.72 2.13-1.38.66-.67 1.07-1.34 1.38-2.13.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91-.31-.79-.72-1.46-1.38-2.13C21.32 1.35 20.65.94 19.86.63 19.1.33 18.22.13 16.95.07 15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 100 12.32 6.16 6.16 0 000-12.32zM12 16a4 4 0 110-8 4 4 0 010 8zm6.41-10.85a1.44 1.44 0 100 2.88 1.44 1.44 0 000-2.88z"/></svg>',
  youtube: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.19a3.02 3.02 0 00-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 00.5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 002.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 002.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81zM9.55 15.57V8.43L15.82 12l-6.27 3.57z"/></svg>',
  tiktok: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64c.3 0 .59.05.86.13V9.4a6.33 6.33 0 00-.86-.06 6.34 6.34 0 105.24 9.96 6.34 6.34 0 001.06-3.53V8.42a8.22 8.22 0 004.83 1.55V6.55a4.83 4.83 0 01-1.02.14z"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.53.07-.8.38-.27.3-1.05 1.03-1.05 2.5s1.08 2.9 1.22 3.1c.15.2 2.12 3.24 5.14 4.54.72.31 1.28.5 1.71.63.72.23 1.37.2 1.89.12.58-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.05 21.5a9.5 9.5 0 01-4.84-1.32l-.35-.2-3.6.94.96-3.5-.23-.36A9.44 9.44 0 012.5 12 9.5 9.5 0 0112 2.5a9.5 9.5 0 019.5 9.5 9.5 9.5 0 01-9.45 9.5zM12 0C5.37 0 0 5.37 0 12c0 2.12.55 4.16 1.6 5.96L0 24l6.2-1.62A11.93 11.93 0 0012 24c6.63 0 12-5.37 12-12S18.63 0 12 0z"/></svg>'
};

async function renderSosmed() {
  const row = document.getElementById('sosmedRow');
  if (!row || !window.sbClient) return;
  try {
    const { data } = await window.sbClient.from('site_settings').select('key,value').like('key', 'sosmed:%');
    const links = (data || []).filter(r => r.value && r.value.trim());
    if (!links.length) return; // tidak tampil jika belum diisi superadmin
    row.innerHTML = links.map(r => {
      const platform = r.key.replace('sosmed:', '');
      const icon = SOSMED_ICONS[platform] || '';
      if (!icon) return '';
      return `<a href="${r.value}" target="_blank" rel="noopener" class="sosmed-link" aria-label="${platform}">${icon}</a>`;
    }).join('');
  } catch (e) { /* diam */ }
}
renderSosmed();

// Luaran Buku & Paten (dari js/data/luaran.json — sumber Tabel 3.5A & 3.5D LKPS)
async function renderLuaran() {
  const bukuList = document.getElementById('bukuList');
  const patenList = document.getElementById('patenList');
  if (!bukuList || !patenList) return;
  try {
    const res = await fetch('js/data/luaran.json');
    const data = await res.json();

    const rowHtml = (item) => `
      <div class="luaran-row">
        <a href="${item.link}" target="_blank" rel="noopener">${item.judul}</a>
        <span class="luaran-meta">${item.penulis.split(',')[0]}${item.penulis.includes(',') ? ' dkk.' : ''} · ${item.tahun}</span>
      </div>`;

    // Tampilkan 8 buku pertama, sisanya di balik tombol "lihat semua"
    const initialCount = 8;
    bukuList.innerHTML = data.buku.slice(0, initialCount).map(rowHtml).join('');
    if (data.buku.length > initialCount) {
      bukuList.innerHTML += `<button class="btn btn-outline-dark luaran-toggle" id="bukuToggle" style="align-self:flex-start;">Lihat ${data.buku.length - initialCount} judul lainnya ↓</button>`;
      document.getElementById('bukuToggle').addEventListener('click', function() {
        bukuList.innerHTML = data.buku.map(rowHtml).join('');
      });
    }

    patenList.innerHTML = data.paten.map(rowHtml).join('');
  } catch (e) {
    console.error('Gagal memuat data luaran:', e);
  }
}
renderLuaran();

// Tautan Mitra Kerjasama (dari js/data/mitra-links.json)
async function renderMitra() {
  const grid = document.getElementById('mitraGrid');
  if (!grid) return;
  try {
    const res = await fetch('js/data/mitra-links.json');
    const data = await res.json();
    grid.innerHTML = data.mitra.map(m => `
      <a href="${m.url}" target="_blank" rel="noopener" class="card" style="display:block;">
        <h3>${m.nama}</h3>
        <p>${m.keterangan}</p>
        <p class="card-link">Kunjungi situs →</p>
      </a>
    `).join('');
  } catch (e) {
    console.error('Gagal memuat mitra:', e);
  }
}
renderMitra();

// TODO (sesi berikutnya):
// - fetch berita dari Supabase (lihat references/tech-stack.md skema tabel `berita`)
// - fetch statistik tracer study / embed iframe (lihat references/tracer-study-integration.md)
// - scroll-reveal per section (IntersectionObserver + class .in-view)
