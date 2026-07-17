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
      .select('judul, kategori, konten, tanggal_publish')
      .eq('published', true)
      .order('tanggal_publish', { ascending: false })
      .limit(6);
    if (error) throw error;
    if (!data.length) {
      grid.innerHTML = '<article class="card"><p class="muted">Belum ada berita dipublikasikan.</p></article>';
      return;
    }
    grid.innerHTML = data.map(b => `
      <article class="card">
        ${b.kategori ? `<p class="card-link" style="margin-bottom:8px;">${b.kategori}</p>` : ''}
        <h3>${b.judul}</h3>
        <p>${(b.konten || '').replace(/<[^>]+>/g, '').slice(0, 140)}${b.konten && b.konten.length > 140 ? '…' : ''}</p>
        <p class="muted" style="font-size:0.78rem;margin-top:10px;">${new Date(b.tanggal_publish).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </article>
    `).join('');
  } catch (e) {
    console.error('Gagal memuat berita:', e);
    grid.innerHTML = '<article class="card"><p class="muted">Belum ada berita dipublikasikan.</p></article>';
  }
}
renderBerita();

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
