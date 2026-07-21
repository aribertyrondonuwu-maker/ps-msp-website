-- =============================================================
-- MIGRASI DATABASE — Fitur BALAS (reply) pada Forum/Percakapan Alumni
-- Jalankan SATU KALI di Supabase: SQL Editor → tempel → Run
-- =============================================================

-- Menambahkan kolom parent_id ke tabel "alumni_diskusi".
-- Jika parent_id kosong (NULL) → pesan itu adalah percakapan utama (thread).
-- Jika parent_id berisi id pesan lain → pesan itu adalah BALASAN atas pesan tsb.

ALTER TABLE alumni_diskusi ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES alumni_diskusi(id) ON DELETE CASCADE;

-- Catatan:
-- • Balasan tetap melewati moderasi admin (kolom approved) sama seperti pesan utama.
-- • ON DELETE CASCADE: jika pesan utama dihapus admin, balasannya ikut terhapus otomatis.
-- • Bila kolom "id" tabel Anda bukan tipe uuid, sesuaikan tipe parent_id agar sama
--   (mis. bigint) — struktur default Supabase memakai uuid.
