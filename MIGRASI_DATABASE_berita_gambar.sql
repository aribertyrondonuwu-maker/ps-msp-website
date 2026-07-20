-- =============================================================
-- MIGRASI DATABASE — Menambahkan dukungan GAMBAR pada Berita/Pengumuman
-- Jalankan SATU KALI di Supabase: menu SQL Editor → tempel → Run
-- =============================================================

-- Menambahkan 3 kolom baru ke tabel "berita":
--   gambar_url   : alamat gambar hasil upload (boleh kosong / tanpa gambar)
--   gambar_rasio : rasio kotak gambar (1.3333 = 4:3, 1.7778 = 16:9, 1 = persegi, 0.75 = 3:4)
--   gambar_lebar : lebar kotak gambar di halaman dalam persen (34 / 42 / 50 / 60)

ALTER TABLE berita ADD COLUMN IF NOT EXISTS gambar_url   text;
ALTER TABLE berita ADD COLUMN IF NOT EXISTS gambar_rasio text DEFAULT '1.3333';
ALTER TABLE berita ADD COLUMN IF NOT EXISTS gambar_lebar text DEFAULT '42';

-- Selesai. Berita lama tetap aman (tanpa gambar); berita baru bisa diberi gambar
-- lewat panel admin: pilih gambar → atur posisi (crop) → atur rasio & lebar kotak.
