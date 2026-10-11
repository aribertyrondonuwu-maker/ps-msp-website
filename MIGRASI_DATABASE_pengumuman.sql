-- ═══════════════════════════════════════════════════════════════════
--  FITUR PENGUMUMAN: tanggal berakhir, sematkan, info kunci, lampiran
--  Jalankan SEKALI di Supabase → SQL Editor → Run. Aman dijalankan ulang.
-- ═══════════════════════════════════════════════════════════════════
alter table public.berita
  add column if not exists tanggal_berakhir date,                 -- deadline / berlaku sampai
  add column if not exists disematkan boolean not null default false,
  add column if not exists waktu_kegiatan text,
  add column if not exists lokasi text,
  add column if not exists target_audiens text,
  add column if not exists narahubung text,                       -- baris: Nama | No. WA | email
  add column if not exists lampiran jsonb not null default '[]'::jsonb;  -- [{label,url,tipe:'dasar'|'unduh'}]
