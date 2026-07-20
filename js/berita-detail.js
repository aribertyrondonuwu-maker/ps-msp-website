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
