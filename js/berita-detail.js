async function loadBeritaDetail() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const judulEl = document.getElementById('beritaJudul');

  if (!id) {
    judulEl.textContent = 'Berita tidak ditemukan';
    return;
  }
  if (!window.sbClient) {
    judulEl.textContent = 'Koneksi database belum tersedia';
    return;
  }

  try {
    const { data, error } = await window.sbClient
      .from('berita')
      .select('*')
      .eq('id', id)
      .eq('published', true)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      judulEl.textContent = 'Berita tidak ditemukan';
      document.getElementById('beritaKonten').innerHTML = '<p class="muted">Berita yang Anda cari tidak tersedia atau belum dipublikasikan.</p>';
      return;
    }

    document.title = data.judul + ' — PS MSP FPIK UNSRAT';
    document.getElementById('beritaKategori').textContent = data.kategori || 'Berita';
    judulEl.textContent = data.judul;
    document.getElementById('beritaTanggal').textContent = new Date(data.tanggal_publish).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    // Gambar berita: kiri gambar, kanan narasi. Lebar & rasio kotak diatur admin.
    const fotoBox = document.getElementById('beritaFotoBox');
    const layout = document.getElementById('beritaLayout');
    const container = document.getElementById('beritaContainer');
    if (data.gambar_url && fotoBox) {
      const lebar = parseInt(data.gambar_lebar, 10) || 42;   // persen lebar kotak gambar
      const rasio = parseFloat(data.gambar_rasio) || (4 / 3); // lebar : tinggi
      fotoBox.style.display = 'block';
      fotoBox.style.flex = `0 0 ${lebar}%`;
      fotoBox.style.maxWidth = `${lebar}%`;
      const img = document.getElementById('beritaFotoImg');
      img.src = data.gambar_url;
      img.alt = data.judul;
      img.style.aspectRatio = String(rasio);
      layout.classList.add('has-foto');
      // beri ruang lebih lebar bila ada gambar berdampingan
      if (container) container.style.maxWidth = '1000px';
    }

    // Render konten: pertahankan paragraf, escape tag berbahaya sederhana
    const konten = (data.konten || '').trim();
    const paragraphs = konten.split(/\n\s*\n/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
    document.getElementById('beritaKonten').innerHTML = paragraphs || '<p class="muted">(Isi berita kosong)</p>';
  } catch (e) {
    console.error('Gagal memuat berita:', e);
    judulEl.textContent = 'Gagal memuat berita';
  }
}
loadBeritaDetail();
