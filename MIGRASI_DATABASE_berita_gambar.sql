-- =============================================================
-- MIGRASI DATABASE — Menambahkan dukungan GAMBAR pada Berita/Pengumuman
-- Jalankan SATU KALI di Supabase: menu SQL Editor → tempel → Run
-- =============================================================

-- Menambahkan 3 kolom baru ke tabel "berita":
--   gambar_url   : alamat gambar hasil upload (boleh kosong / tanpa gambar)
--   gambar_rasio : rasio kotak gambar (1.3333 = 4:3, 1.7778 = 16:9, 1 = persegi, 0.75 = 3:4)
--   gambar_lebar : lebar kotak gambar di halaman dalam persen (34 / 42 / 50 / 60)

ALTER TABLE berita ADD COLUMN IF NOT EXISTS gambar_url   text;
ALTER TABLE berita ADD COLUMN IF NOT EXISTS gambar_rasio text DEFAULT 'asli';
ALTER TABLE berita ADD COLUMN IF NOT EXISTS gambar_lebar text DEFAULT '50';
ALTER TABLE berita ADD COLUMN IF NOT EXISTS gambar_posisi text DEFAULT 'kiri';
ALTER TABLE berita ADD COLUMN IF NOT EXISTS galeri_foto  jsonb DEFAULT '[]'::jsonb;

-- galeri_foto: daftar URL foto dokumentasi tambahan (0 atau lebih), terpisah dari
-- gambar_url (foto utama). Ditampilkan sebagai galeri di bawah isi berita, dengan
-- lightbox agar pengunjung bisa memperbesar & menavigasi antar foto.

-- Selesai. Berita lama tetap aman (tanpa gambar); berita baru bisa diberi gambar
-- lewat panel admin: pilih gambar → atur posisi (crop) → atur rasio & lebar kotak.
