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
  try {
    const res = await fetch('js/data/dosen.json');
    if (!res.ok) throw new Error('belum ada dosen.json');
    const dosen = await res.json();
    grid.innerHTML = dosen.map(d => `
      <a class="dosen-card" href="dosen-detail.html?id=${d.id}">
        <div class="dosen-photo">${d.inisial || d.nama.split(' ').map(w => w[0]).slice(0,2).join('')}</div>
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

document.getElementById('year').textContent = new Date().getFullYear();

// Render galeri dari js/data/galeri.json (placeholder sampai foto/video asli tersedia)
async function renderGaleri() {
  const grid = document.getElementById('galeriGrid');
  if (!grid) return;
  try {
    const res = await fetch('js/data/galeri.json');
    const data = await res.json();
    grid.innerHTML = data.item.map(g => {
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

// TODO (sesi berikutnya):
// - fetch berita dari Supabase (lihat references/tech-stack.md skema tabel `berita`)
// - fetch statistik tracer study / embed iframe (lihat references/tracer-study-integration.md)
// - scroll-reveal per section (IntersectionObserver + class .in-view)
