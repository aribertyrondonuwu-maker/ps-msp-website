-- ═══════════════════════════════════════════════════════════════════
--  KUNJUNGAN (anonim) + KOMENTAR (dimoderasi)
--  Jalankan SEKALI di Supabase → SQL Editor → Run. Aman dijalankan ulang.
--  Prasyarat: MIGRASI_DATABASE_dokumen_berlogin.sql (fungsi is_admin) sudah dijalankan.
-- ═══════════════════════════════════════════════════════════════════

-- 1. KUNJUNGAN: satu baris per (pengunjung anonim, halaman, hari). Tanpa IP, tanpa nama.
create table if not exists public.kunjungan (
  visitor text not null,
  halaman text not null,
  tanggal date not null default ((now() at time zone 'Asia/Makassar')::date),
  primary key (visitor, halaman, tanggal)
);
alter table public.kunjungan enable row level security;   -- tanpa policy = tertutup untuk akses langsung

create or replace function public.catat_kunjungan(p_visitor text, p_halaman text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_visitor !~ '^[A-Za-z0-9_-]{8,64}$' then return; end if;
  if p_halaman !~ '^[A-Za-z0-9/_.?=&-]{1,120}$' then return; end if;
  insert into public.kunjungan (visitor, halaman) values (p_visitor, lower(p_halaman))
  on conflict do nothing;
end $$;

create or replace function public.statistik_kunjungan()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'total',     (select count(*) from kunjungan),
    'unik',      (select count(distinct visitor) from kunjungan),
    'hari_ini',  (select count(*) from kunjungan where tanggal = (now() at time zone 'Asia/Makassar')::date),
    'unik_hari_ini', (select count(distinct visitor) from kunjungan where tanggal = (now() at time zone 'Asia/Makassar')::date),
    'bulan_ini', (select count(*) from kunjungan
                  where date_trunc('month', tanggal) = date_trunc('month', (now() at time zone 'Asia/Makassar')::date)),
    'populer',   (select coalesce(json_agg(t), '[]'::json) from (
                    select halaman, count(*) as jumlah from kunjungan
                    group by halaman order by count(*) desc, halaman limit 5) t)
  );
$$;

grant execute on function public.catat_kunjungan(text, text) to anon, authenticated;
grant execute on function public.statistik_kunjungan() to anon, authenticated;

-- 2. KOMENTAR: masuk lewat fungsi (dengan validasi + batas frekuensi), status awal 'menunggu'
create table if not exists public.komentar (
  id uuid primary key default gen_random_uuid(),
  berita_id uuid not null references public.berita(id) on delete cascade,
  nama text not null check (char_length(nama) between 2 and 60),
  isi text not null check (char_length(isi) between 3 and 1000),
  status text not null default 'menunggu' check (status in ('menunggu','disetujui','ditolak')),
  visitor text,
  created_at timestamptz not null default now()
);
create index if not exists komentar_berita_idx on public.komentar (berita_id, status, created_at);
alter table public.komentar enable row level security;

drop policy if exists "komentar_baca_publik" on public.komentar;
create policy "komentar_baca_publik" on public.komentar
  for select to anon, authenticated using (status = 'disetujui');

drop policy if exists "komentar_baca_admin" on public.komentar;
create policy "komentar_baca_admin" on public.komentar
  for select to authenticated using (public.is_admin());

drop policy if exists "komentar_ubah_admin" on public.komentar;
create policy "komentar_ubah_admin" on public.komentar
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "komentar_hapus_admin" on public.komentar;
create policy "komentar_hapus_admin" on public.komentar
  for delete to authenticated using (public.is_admin());
-- (tidak ada policy INSERT: pengiriman hanya lewat fungsi kirim_komentar di bawah)

create or replace function public.kirim_komentar(p_berita uuid, p_nama text, p_isi text, p_visitor text, p_hp text default '')
returns void language plpgsql security definer set search_path = public as $$
declare v_nama text := btrim(coalesce(p_nama, '')); v_isi text := btrim(coalesce(p_isi, ''));
begin
  if coalesce(p_hp, '') <> '' then return; end if;                       -- jebakan bot: diam-diam diabaikan
  if char_length(v_nama) < 2 or char_length(v_nama) > 60 then raise exception 'Nama harus 2–60 karakter.'; end if;
  if char_length(v_isi) < 3 or char_length(v_isi) > 1000 then raise exception 'Komentar harus 3–1000 karakter.'; end if;
  if v_isi ~* '(https?://|www\.|\.com|\.id/)' or v_nama ~* '(https?://|www\.)' then
    raise exception 'Komentar tidak boleh memuat tautan.'; end if;
  if not exists (select 1 from public.berita where id = p_berita and published) then
    raise exception 'Berita tidak ditemukan.'; end if;
  if coalesce(p_visitor, '') !~ '^[A-Za-z0-9_-]{8,64}$' then raise exception 'Permintaan tidak valid.'; end if;
  if (select count(*) from public.komentar where visitor = p_visitor and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'Terlalu sering mengirim komentar. Coba lagi nanti.'; end if;
  if (select count(*) from public.komentar where created_at > now() - interval '1 hour') >= 40 then
    raise exception 'Komentar sedang dibatasi sementara. Coba lagi nanti.'; end if;
  insert into public.komentar (berita_id, nama, isi, visitor) values (p_berita, v_nama, v_isi, p_visitor);
end $$;

grant execute on function public.kirim_komentar(uuid, text, text, text, text) to anon, authenticated;
