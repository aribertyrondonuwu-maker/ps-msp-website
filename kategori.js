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
