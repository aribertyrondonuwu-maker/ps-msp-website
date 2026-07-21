-- ═══════════════════════════════════════════════════════════════════
--  KEAMANAN DATABASE — Row Level Security (RLS) per-tabel
--  Jalankan SEKALI di Supabase → SQL Editor → tempel → Run
--  Nama tabel sudah disesuaikan dengan yang DIPAKAI kode situs.
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────
-- 1. alumni_diskusi  (forum/percakapan alumni)
--    Publik boleh: BACA (yang approved) & KIRIM pesan baru.
--    Publik TIDAK boleh: mengubah/menghapus (hanya admin via dashboard).
-- ───────────────────────────────────────────────
ALTER TABLE alumni_diskusi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "diskusi_baca_publik" ON alumni_diskusi;
CREATE POLICY "diskusi_baca_publik" ON alumni_diskusi
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "diskusi_kirim_publik" ON alumni_diskusi;
CREATE POLICY "diskusi_kirim_publik" ON alumni_diskusi
  FOR INSERT WITH CHECK (true);
-- (Sengaja TIDAK ada policy UPDATE/DELETE untuk publik → hanya admin.)

-- ───────────────────────────────────────────────
-- 2. berita
--    Publik hanya BACA. Tulis/ubah/hapus lewat admin.
-- ───────────────────────────────────────────────
ALTER TABLE berita ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "berita_baca_publik" ON berita;
CREATE POLICY "berita_baca_publik" ON berita
  FOR SELECT USING (true);

-- ───────────────────────────────────────────────
-- 3. galeri
--    Publik hanya BACA.
-- ───────────────────────────────────────────────
ALTER TABLE galeri ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "galeri_baca_publik" ON galeri;
CREATE POLICY "galeri_baca_publik" ON galeri
  FOR SELECT USING (true);

-- ───────────────────────────────────────────────
-- 4. site_settings  (logo, foto dosen/pengurus, sosmed, hero)
--    Publik hanya BACA. Perubahan lewat admin.
-- ───────────────────────────────────────────────
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_baca_publik" ON site_settings;
CREATE POLICY "settings_baca_publik" ON site_settings
  FOR SELECT USING (true);

-- ───────────────────────────────────────────────
-- 5. admin_users  (KREDENSIAL ADMIN — PALING SENSITIF)
--    RLS aktif TANPA policy publik apa pun.
--    Artinya: anon key TIDAK bisa baca/tulis sama sekali.
--    Autentikasi admin sebaiknya lewat Supabase Auth / RPC khusus.
--    JANGAN pernah beri policy SELECT/INSERT publik ke tabel ini.
-- ───────────────────────────────────────────────
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
-- (tidak ada CREATE POLICY → tertutup total untuk publik)

-- ───────────────────────────────────────────────
-- 6. media  (metadata media galeri, bila dipakai)
--    Publik hanya BACA.
-- ───────────────────────────────────────────────
ALTER TABLE media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "media_baca_publik" ON media;
CREATE POLICY "media_baca_publik" ON media
  FOR SELECT USING (true);

-- ═══════════════════════════════════════════════════════════════════
--  CATATAN PENTING:
--  • Admin panel yang menulis berita/galeri/settings HARUS memakai
--    sesi terautentikasi (Supabase Auth). Jika saat ini admin menulis
--    dengan anon key biasa, tambahkan policy INSERT/UPDATE/DELETE yang
--    dibatasi ke peran terautentikasi, misalnya:
--
--      CREATE POLICY "berita_tulis_admin" ON berita
--        FOR ALL TO authenticated USING (true) WITH CHECK (true);
--
--    Sesuaikan dengan mekanisme login admin Anda sebelum mengaktifkan,
--    agar admin tetap bisa mengelola konten setelah RLS menyala.
-- ═══════════════════════════════════════════════════════════════════
