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

    renderPengumumanExtra(data);

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

    // Render konten: HTML kaya (dari editor) atau teks polos (data lama)
    const konten = (data.konten || '').trim();
    const isHtml = /<[a-z][\s\S]*>/i.test(konten);
    let kontenHtml;
    if (isHtml) {
      kontenHtml = konten;
    } else {
      kontenHtml = konten.split(/\n\s*\n/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
    }
    document.getElementById('beritaKonten').innerHTML = kontenHtml || '<p class="muted">(Isi berita kosong)</p>';

    // Galeri foto dokumentasi (0 atau lebih)
    const galeri = Array.isArray(data.galeri_foto) ? data.galeri_foto.filter(Boolean) : [];
    if (galeri.length) {
      _galeriFotos = galeri;
      const section = document.getElementById('beritaGaleriSection');
      const grid = document.getElementById('beritaGaleriGrid');
      section.style.display = 'block';
      grid.innerHTML = galeri.map((url, i) => `
        <button type="button" class="berita-galeri-thumb" onclick="bukaLightbox(${i})">
          <img src="${url}" alt="Dokumentasi kegiatan ${i + 1}" loading="lazy">
        </button>`).join('');
    }
  } catch (e) {
    console.error('Gagal memuat berita:', e);
    judulEl.textContent = 'Gagal memuat berita';
  }
}
loadBeritaDetail();

// ── Lightbox galeri foto ──
let _galeriFotos = [];
let _galeriIndex = 0;

function bukaLightbox(i) {
  _galeriIndex = i;
  const lb = document.getElementById('galeriLightbox');
  document.getElementById('galeriLightboxImg').src = _galeriFotos[i];
  lb.classList.add('active');
  document.body.style.overflow = 'hidden';
}
function tutupLightbox(e) {
  if (e && e.target.closest('img')) return; // klik gambar tidak menutup
  document.getElementById('galeriLightbox').classList.remove('active');
  document.body.style.overflow = '';
}
function navLightbox(e, dir) {
  e.stopPropagation();
  _galeriIndex = (_galeriIndex + dir + _galeriFotos.length) % _galeriFotos.length;
  document.getElementById('galeriLightboxImg').src = _galeriFotos[_galeriIndex];
}
document.addEventListener('keydown', (e) => {
  const lb = document.getElementById('galeriLightbox');
  if (!lb || !lb.classList.contains('active')) return;
  if (e.key === 'Escape') tutupLightbox();
  if (e.key === 'ArrowLeft') navLightbox(e, -1);
  if (e.key === 'ArrowRight') navLightbox(e, 1);
});


// ── Tambahan khusus PENGUMUMAN: dasar hukum, info kunci, aksi, narahubung, bagikan, terkait ──
function renderPengumumanExtra(d) {
  const pk = parseKategori(d.kategori);
  const bc = document.getElementById('beritaBreadcrumb');
  if (pk.jenis !== 'Pengumuman') {
    bc.innerHTML += ' › ' + escHtml(d.judul);
    return;
  }
  bc.innerHTML = '<a href="index.html">Beranda</a> › <a href="berita.html">Berita</a> › <a href="pengumuman.html">Pengumuman</a> › ' + escHtml(d.judul);
  const kembali = document.getElementById('beritaKembali');
  kembali.href = 'pengumuman.html'; kembali.textContent = '← Kembali ke arsip pengumuman';
  const i = infoPengumuman(d);
  document.getElementById('beritaKategori').innerHTML = escHtml('PENGUMUMAN · ' + pk.sub) + badgePengumuman(i);

  const fmt = (x) => new Date(x + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const lamp = Array.isArray(d.lampiran) ? d.lampiran.filter(l => l && /^https?:\/\//i.test(l.url || '')) : [];
  const dasar = lamp.filter(l => l.tipe === 'dasar');
  const unduh = lamp.filter(l => l.tipe !== 'dasar');
  let atas = '';
  if (dasar.length) {
    atas += `<div class="peng-detail-box peng-box-dasar"><h3>Dasar Hukum</h3><div class="peng-actions" style="margin:0">` +
      dasar.map(l => `<a class="btn btn-primary btn-sm" href="${escHtml(l.url)}" target="_blank" rel="noopener">⬇ ${escHtml(l.label)}</a>`).join('') + '</div></div>';
  }
  const kunci = [];
  if (d.waktu_kegiatan) kunci.push(['Waktu', escHtml(d.waktu_kegiatan), '']);
  if (d.lokasi) kunci.push(['Lokasi / media', escHtml(d.lokasi), '']);
  if (d.tanggal_berakhir) kunci.push(['Deadline', escHtml(fmt(d.tanggal_berakhir)) + (i.berakhir ? ' (berakhir)' : i.sisa != null ? ` — ${i.sisa} hari lagi` : ''), 'deadline']);
  if (d.target_audiens) kunci.push(['Target peserta', escHtml(d.target_audiens), '']);
  if (kunci.length) {
    atas += '<div class="peng-detail-box peng-box-kunci"><h3>Info Kunci</h3><dl class="peng-kunci">' +
      kunci.map(k => `<dt>${k[0]}</dt><dd class="${k[2]}">${k[1]}</dd>`).join('') + '</dl></div>';
  }
  document.getElementById('pengAtas').innerHTML = atas;

  let bawah = '';
  if (unduh.length) {
    bawah += '<div class="peng-actions">' + unduh.map(l => `<a class="btn btn-primary btn-sm" href="${escHtml(l.url)}" target="_blank" rel="noopener">⬇ ${escHtml(l.label)}</a>`).join('') + '</div>';
  }
  const kontak = (d.narahubung || '').split('\n').map(s => s.trim()).filter(Boolean).map(s => s.split('|').map(x => x.trim()));
  if (kontak.length) {
    bawah += '<div class="peng-detail-box"><h3>Narahubung</h3>' + kontak.map(([nama, wa, email]) => {
      const digits = (wa || '').replace(/\D/g, '').replace(/^0/, '62');
      return `<p style="margin:4px 0"><strong>${escHtml(nama || '')}</strong>` +
        (digits ? ` · <a href="https://wa.me/${digits}" target="_blank" rel="noopener">WhatsApp ${escHtml(wa)}</a>` : '') +
        (email ? ` · <a href="mailto:${escHtml(email)}">${escHtml(email)}</a>` : '') + '</p>';
    }).join('') + '</div>';
  }
  const url = location.href;
  bawah += `<div class="peng-share"><a class="btn btn-primary btn-sm" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(d.judul + ' — ' + url)}">Bagikan ke WhatsApp</a>
    <button type="button" class="btn-outline-dark btn-sm-outline" style="color:var(--navy);border-color:var(--navy)" id="salinTautan">Salin tautan</button></div>`;
  bawah += '<div id="pengTerkait"></div>';
  document.getElementById('pengBawah').innerHTML = bawah;
  document.getElementById('salinTautan').addEventListener('click', async (e) => {
    try { await navigator.clipboard.writeText(url); e.target.textContent = 'Tautan disalin ✓'; } catch (_) { prompt('Salin tautan ini:', url); }
  });
  // Pengumuman terkait (kategori sama dulu, lalu terbaru)
  window.sbClient.from('berita').select('id, judul, kategori, tanggal_publish, tanggal_berakhir').eq('published', true)
    .order('tanggal_publish', { ascending: false }).limit(30).then(({ data }) => {
      const lain = (data || []).filter(x => x.id !== d.id && parseKategori(x.kategori).jenis === 'Pengumuman');
      lain.sort((a, b) => (parseKategori(b.kategori).sub === pk.sub) - (parseKategori(a.kategori).sub === pk.sub));
      const t = lain.slice(0, 3);
      if (t.length) document.getElementById('pengTerkait').innerHTML = '<h3 style="margin:8px 0">Pengumuman terkait</h3><div class="peng-related">' +
        t.map(x => `<a href="berita-detail.html?id=${encodeURIComponent(x.id)}">${escHtml(x.judul)}</a>`).join('') + '</div>';
    });
}


// ── Komentar (dimoderasi admin) ──
async function muatKomentar(id) {
  const box = document.getElementById('komDaftar');
  try {
    const { data, error } = await window.sbClient.from('komentar').select('nama, isi, created_at')
      .eq('berita_id', id).eq('status', 'disetujui').order('created_at', { ascending: true });
    if (error) throw error;
    document.getElementById('komJumlah').textContent = (data || []).length ? '(' + data.length + ')' : '';
    box.innerHTML = (data || []).length ? data.map(k => `<div class="komentar-item"><strong>${escHtml(k.nama)}</strong>
      <small>${new Date(k.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</small>
      <p>${escHtml(k.isi)}</p></div>`).join('') : '<p class="muted">Belum ada komentar. Jadilah yang pertama.</p>';
  } catch (e) {
    box.innerHTML = '<p class="muted">Komentar belum tersedia.</p>';
  }
}
(function () {
  const id = new URLSearchParams(location.search).get('id');
  const form = document.getElementById('komForm');
  if (!id || !form || !window.sbClient) { if (form) form.style.display = 'none'; return; }
  muatKomentar(id);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const st = document.getElementById('komStatus');
    const nama = document.getElementById('komNama').value.trim();
    const isi = document.getElementById('komIsi').value.trim();
    if (nama.length < 2 || isi.length < 3) { st.textContent = '⚠️ Isi nama (min. 2 huruf) dan komentar (min. 3 huruf).'; return; }
    let last = 0; try { last = parseInt(localStorage.getItem('msp_kom_t') || '0', 10); } catch (_) {}
    if (Date.now() - last < 60000) { st.textContent = '⚠️ Tunggu sebentar sebelum mengirim komentar lagi.'; return; }
    st.textContent = 'Mengirim…';
    const vid = window._mspVid || (function () { try { return localStorage.getItem('msp_vid'); } catch (_) { return null; } })() || ('anon' + Math.random().toString(16).slice(2, 14));
    const { error } = await window.sbClient.rpc('kirim_komentar', { p_berita: id, p_nama: nama, p_isi: isi, p_visitor: vid, p_hp: document.getElementById('komHp').value });
    if (error) {
      st.textContent = '⚠️ ' + (/function|schema cache/i.test(error.message) ? 'Fitur komentar belum diaktifkan.' : error.message);
      return;
    }
    try { localStorage.setItem('msp_kom_t', String(Date.now())); } catch (_) {}
    form.reset();
    st.textContent = '✅ Terima kasih. Komentar Anda akan tampil setelah disetujui admin.';
  });
})();
