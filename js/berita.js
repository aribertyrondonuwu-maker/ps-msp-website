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
    renderBeritaList('semua');
  } catch (e) {
    console.error('Gagal memuat berita:', e);
    grid.innerHTML = '<p class="muted">Belum ada berita dipublikasikan.</p>';
  }
}

function renderBeritaList(kategori) {
  const grid = document.getElementById('beritaListGrid');
  const list = kategori === 'semua' ? _allBerita : _allBerita.filter(b => b.kategori === kategori);
  if (!list.length) {
    grid.innerHTML = `<p class="muted">Belum ada berita${kategori !== 'semua' ? ' kategori ' + kategori : ''}.</p>`;
    return;
  }
  grid.innerHTML = list.map(b => `
    <a href="berita-detail.html?id=${b.id}" class="card" style="display:block;">
      ${b.kategori ? `<p class="card-link" style="margin-bottom:8px;">${b.kategori}</p>` : ''}
      <h3>${b.judul}</h3>
      <p>${(b.konten || '').replace(/<[^>]+>/g, '').slice(0, 160)}${b.konten && b.konten.length > 160 ? '…' : ''}</p>
      <p class="muted" style="font-size:0.78rem;margin-top:10px;">${new Date(b.tanggal_publish).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
    </a>
  `).join('');
}

document.querySelectorAll('#beritaFilter .kerjasama-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#beritaFilter .kerjasama-tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderBeritaList(btn.dataset.cat);
  });
});

loadBeritaList();
