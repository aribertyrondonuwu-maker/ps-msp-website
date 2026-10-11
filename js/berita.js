let _allBerita = [];

async function loadBeritaList() {
  const grid = document.getElementById('beritaListGrid');
  if (!window.sbClient) {
    grid.innerHTML = '<p class="muted">Koneksi database belum tersedia.</p>';
    return;
  }
  try {
    const { data, error } = await window.sbClient
      .from('berita')
      .select('id, judul, kategori, konten, tanggal_publish')
      .eq('published', true)
      .order('tanggal_publish', { ascending: false });
    if (error) throw error;
    _allBerita = data || [];
    renderBeritaList();
  } catch (e) {
    console.error('Gagal memuat berita:', e);
    grid.innerHTML = '<p class="muted">Belum ada berita dipublikasikan.</p>';
  }
}

let _jenis = 'semua', _sub = 'semua';
function renderBeritaList() {
  const grid = document.getElementById('beritaListGrid');
  const list = _allBerita.filter(b => {
    const p = parseKategori(b.kategori);
    return (_jenis === 'semua' || p.jenis === _jenis) && (_sub === 'semua' || p.sub === _sub);
  });
  if (!list.length) {
    grid.innerHTML = `<p class="muted">Belum ada ${_jenis === 'semua' ? 'berita atau pengumuman' : _jenis.toLowerCase()}${_sub !== 'semua' ? ' kategori ' + _sub : ''}.</p>`;
    return;
  }
  grid.innerHTML = list.map(b => {
    const p = parseKategori(b.kategori);
    const thumb = b.gambar_url
      ? `<div class="berita-list-thumb"><img src="${b.gambar_url}" alt="${b.judul}" loading="lazy"></div>`
      : '';
    return `
    <a href="berita-detail.html?id=${b.id}" class="card berita-list-card${b.gambar_url ? ' has-thumb' : ''}">
      ${thumb}
      <div class="berita-list-body">
        <p class="card-link" style="margin-bottom:8px;">${p.jenis.toUpperCase()} · ${p.sub}</p>
        <h3>${b.judul}</h3>
        <p>${(b.konten || '').replace(/<[^>]+>/g, '').slice(0, 160)}${b.konten && b.konten.length > 160 ? '…' : ''}</p>
        <p class="muted" style="font-size:0.78rem;margin-top:10px;">${new Date(b.tanggal_publish).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>
    </a>
  `; }).join('');
}

document.querySelectorAll('#beritaJenis .kerjasama-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#beritaJenis .kerjasama-tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    _jenis = btn.dataset.jenis;
    renderBeritaList();
  });
});

document.querySelectorAll('#beritaFilter .kerjasama-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#beritaFilter .kerjasama-tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    _sub = btn.dataset.cat;
    renderBeritaList();
  });
});

loadBeritaList();
