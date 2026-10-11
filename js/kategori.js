// Dua jenis utama: BERITA dan PENGUMUMAN. Sub-kategori sama untuk keduanya.
// Disimpan di kolom `kategori`: berita = "Perkuliahan"; pengumuman = "Pengumuman · Perkuliahan".
// Data lama tetap terbaca: "Pengumuman" saja → Pengumuman/Lain-lain; "Akademik" → Berita/Perkuliahan.
window.SUB_KATEGORI = ['Perkuliahan', 'Kemahasiswaan', 'Penelitian', 'Pengabdian', 'Penjaminan Mutu', 'Prestasi', 'Kerjasama', 'Lain-lain'];
window.parseKategori = function (k) {
  k = (k || '').trim();
  if (!k) return { jenis: 'Berita', sub: 'Lain-lain' };
  if (k === 'Pengumuman') return { jenis: 'Pengumuman', sub: 'Lain-lain' };
  if (k.indexOf('Pengumuman · ') === 0) return { jenis: 'Pengumuman', sub: k.slice(13) || 'Lain-lain' };
  if (k === 'Akademik') return { jenis: 'Berita', sub: 'Perkuliahan' };
  return { jenis: 'Berita', sub: k };
};
window.buildKategori = function (jenis, sub) {
  return jenis === 'Pengumuman' ? 'Pengumuman · ' + sub : sub;
};

// Status pengumuman: Baru (<=7 hari), Deadline segera (<=3 hari), Berakhir (lewat tanggal_berakhir)
window.infoPengumuman = function (b) {
  const now = new Date();
  const pub = new Date(b.tanggal_publish);
  const baru = (now - pub) / 864e5 <= 7;
  let berakhir = false, segera = false, sisa = null;
  if (b.tanggal_berakhir) {
    const end = new Date(b.tanggal_berakhir + 'T23:59:59');
    berakhir = end < now;
    sisa = Math.ceil((end - now) / 864e5);
    segera = !berakhir && sisa <= 3;
  }
  return { baru, berakhir, segera, sisa, sematkan: !!b.disematkan };
};
window.badgePengumuman = function (i) {
  let h = '';
  if (i.sematkan && !i.berakhir) h += '<span class="peng-badge b-semat">📌 Disematkan</span>';
  if (i.segera) h += '<span class="peng-badge b-segera">Deadline segera</span>';
  if (i.berakhir) h += '<span class="peng-badge b-akhir">Berakhir</span>';
  else if (i.baru) h += '<span class="peng-badge b-baru">Baru</span>';
  return h;
};
window.katClass = function (sub) {
  return 'kat-' + String(sub || 'lain').toLowerCase().replace(/[^a-z]+/g, '');
};
window.escHtml = function (s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
};
