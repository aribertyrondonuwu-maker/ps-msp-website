// Script ringan khusus halaman /en/ — path data disesuaikan dengan prefix '../'
// karena file EN berada di subfolder. Konten dinamis (bio dosen, berita) masih
// bersumber dari data Bahasa Indonesia sampai versi terjemahan tersedia.

const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  });
}

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

async function renderDosenEn() {
  const grid = document.getElementById('dosenGrid');
  if (!grid) return;
  try {
    const res = await fetch('../js/data/dosen.json');
    if (!res.ok) throw new Error('dosen.json not found');
    const dosen = await res.json();
    grid.innerHTML = dosen.map(d => `
      <a class="dosen-card" href="../dosen-detail.html?id=${d.id}">
        <div class="dosen-photo">${d.inisial || d.nama.split(' ').map(w => w[0]).slice(0,2).join('')}</div>
        <div class="dosen-info">
          <h4>${d.nama}</h4>
          <p>${d.keahlian}</p>
        </div>
      </a>
    `).join('');
  } catch (e) {
    grid.innerHTML = '<p class="muted">Faculty data unavailable right now — see the <a href="../index.html#dosen">Indonesian page</a>.</p>';
  }
}
renderDosenEn();

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

const SOSMED_ICONS = {
  instagram: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.64.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85C2.38 3.92 3.9 2.38 7.15 2.23 8.42 2.17 8.8 2.16 12 2.16zm0-2.16C8.74 0 8.33.01 7.05.07 2.7.27.27 2.69.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.2 4.36 2.62 6.78 6.98 6.98C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c4.35-.2 6.78-2.62 6.98-6.98.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.2-4.35-2.62-6.78-6.98-6.98C15.67.01 15.26 0 12 0zm0 5.84A6.16 6.16 0 1 0 12 18.16 6.16 6.16 0 0 0 12 5.84zm0 10.16A4 4 0 1 1 12 8a4 4 0 0 1 0 8zm6.41-10.39a1.44 1.44 0 1 1-2.88 0 1.44 1.44 0 0 1 2.88 0z"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.45h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z"/></svg>',
  youtube: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.53.07-.8.38-.27.3-1.05 1.03-1.05 2.5s1.08 2.9 1.22 3.1c.15.2 2.12 3.24 5.14 4.54.72.31 1.28.5 1.71.63.72.23 1.37.2 1.89.12.58-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.05 21.5a9.5 9.5 0 01-4.84-1.32l-.35-.2-3.6.94.96-3.5-.23-.36A9.44 9.44 0 012.5 12 9.5 9.5 0 0112 2.5a9.5 9.5 0 019.5 9.5 9.5 9.5 0 01-9.45 9.5zM12 0C5.37 0 0 5.37 0 12c0 2.12.55 4.16 1.6 5.96L0 24l6.2-1.62A11.93 11.93 0 0012 24c6.63 0 12-5.37 12-12S18.63 0 12 0z"/></svg>'
};

async function renderSosmedEn() {
  const row = document.getElementById('sosmedRow');
  if (!row || !window.sbClient) return;
  try {
    const { data } = await window.sbClient.from('site_settings').select('key,value').like('key', 'sosmed:%');
    const links = (data || []).filter(r => r.value && r.value.trim());
    if (!links.length) return;
    row.innerHTML = links.map(r => {
      const platform = r.key.replace('sosmed:', '');
      const icon = SOSMED_ICONS[platform] || '';
      if (!icon) return '';
      return `<a href="${r.value}" target="_blank" rel="noopener" class="sosmed-link" aria-label="${platform}">${icon}</a>`;
    }).join('');
  } catch (e) { /* silent */ }
}
renderSosmedEn();
