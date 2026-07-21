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
      const img = document.getElementById('beritaFotoImg');
      img.src = data.gambar_url;
      img.alt = data.judul;
      fotoBox.style.display = 'block';

      const posisi = data.gambar_posisi || 'kiri';
      const lebar = parseInt(data.gambar_lebar, 10) || 42;

      // reset kelas posisi
      fotoBox.className = 'berita-foto-box pos-' + posisi;

      if (posisi === 'penuh') {
        fotoBox.style.width = '100%';
        fotoBox.style.maxWidth = '680px';
        fotoBox.style.float = 'none';
        fotoBox.style.margin = '0 auto 24px';
      } else if (posisi === 'inline') {
        // kecil, sejajar/mengambang kiri dengan lebar terbatas
        fotoBox.style.width = Math.min(lebar, 34) + '%';
        fotoBox.style.float = 'left';
        fotoBox.style.margin = '4px 22px 12px 0';
      } else {
        // kiri / kanan → float, teks membungkus
        fotoBox.style.width = lebar + '%';
        fotoBox.style.float = (posisi === 'kanan') ? 'right' : 'left';
        fotoBox.style.margin = (posisi === 'kanan') ? '4px 0 16px 26px' : '4px 26px 16px 0';
      }

      // crop hanya bila rasio spesifik dipilih (bukan 'asli'/kosong)
      const rasioRaw = (data.gambar_rasio || '').toString().trim();
      const rasioNum = parseFloat(rasioRaw);
      const pakaiCrop = rasioRaw && rasioRaw !== 'asli' && !isNaN(rasioNum) && rasioNum > 0;
      if (pakaiCrop) {
        img.style.aspectRatio = String(rasioNum);
        img.style.objectFit = 'cover';
      } else {
        img.style.aspectRatio = 'auto';
        img.style.objectFit = 'contain';
      }
    }

    // Render konten: pertahankan paragraf
    const konten = (data.konten || '').trim();
    const paragraphs = konten.split(/\n\s*\n/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
    document.getElementById('beritaKonten').innerHTML = paragraphs || '<p class="muted">(Isi berita kosong)</p>';
  } catch (e) {
    console.error('Gagal memuat berita:', e);
    judulEl.textContent = 'Gagal memuat berita';
  }
}
loadBeritaDetail();
