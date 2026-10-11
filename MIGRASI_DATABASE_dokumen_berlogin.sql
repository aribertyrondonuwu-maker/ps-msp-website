-- ═══════════════════════════════════════════════════════════════════
--  DOKUMEN BERLOGIN (LKPS, LED, dll.) + HAK AKSES ADMIN/SUPERADMIN
--  Jalankan SEKALI di Supabase → SQL Editor → tempel → Run
--  Aman dijalankan ulang (idempotent).
--
--  Hak akses:
--    admin      → melihat & mengunduh dokumen; mengelola berita/galeri/foto
--    superadmin → semua hak admin + unggah/ganti/hapus dokumen + kelola admin
--  Penegakan dilakukan DI DATABASE (RLS), bukan hanya di tampilan.
-- ═══════════════════════════════════════════════════════════════════

-- 1. Fungsi pembantu peran (membaca tabel admin_users tanpa membukanya ke publik)
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admin_users
    where lower(username) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create or replace function public.is_superadmin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admin_users
    where lower(username) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and role = 'superadmin'
  );
$$;

revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_superadmin() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_superadmin() to authenticated;

-- 2. admin_users: admin hanya boleh membaca barisnya sendiri; superadmin boleh kelola semua
alter table admin_users enable row level security;

drop policy if exists "admin_users_baca_sendiri" on admin_users;
create policy "admin_users_baca_sendiri" on admin_users
  for select to authenticated
  using (lower(username) = lower(coalesce(auth.jwt() ->> 'email', '')) or public.is_superadmin());

drop policy if exists "admin_users_tulis_superadmin" on admin_users;
create policy "admin_users_tulis_superadmin" on admin_users
  for all to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());

-- 3. Tabel metadata dokumen
create table if not exists public.dokumen_internal (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  jenis text not null check (jenis in ('LKPS','LED','Lainnya')),
  tahun int,
  versi text,
  catatan text,
  file_path text,            -- lokasi file di bucket privat 'dokumen'
  file_name text,
  ukuran bigint,
  link_eksternal text,       -- opsi: tautan Google Sheets/Docs (akses diatur di Google)
  diunggah_oleh text,
  created_at timestamptz not null default now(),
  constraint dokumen_punya_isi check (file_path is not null or link_eksternal is not null)
);

alter table public.dokumen_internal enable row level security;

drop policy if exists "dokumen_baca_admin" on public.dokumen_internal;
create policy "dokumen_baca_admin" on public.dokumen_internal
  for select to authenticated using (public.is_admin());

drop policy if exists "dokumen_tulis_superadmin" on public.dokumen_internal;
create policy "dokumen_tulis_superadmin" on public.dokumen_internal
  for all to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());

-- 4. Bucket PRIVAT 'dokumen' (maks. 50 MB per file)
insert into storage.buckets (id, name, public, file_size_limit)
values ('dokumen', 'dokumen', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;

drop policy if exists "dokumen_storage_baca" on storage.objects;
create policy "dokumen_storage_baca" on storage.objects
  for select to authenticated
  using (bucket_id = 'dokumen' and public.is_admin());

drop policy if exists "dokumen_storage_unggah" on storage.objects;
create policy "dokumen_storage_unggah" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'dokumen' and public.is_superadmin());

drop policy if exists "dokumen_storage_ubah" on storage.objects;
create policy "dokumen_storage_ubah" on storage.objects
  for update to authenticated
  using (bucket_id = 'dokumen' and public.is_superadmin());

drop policy if exists "dokumen_storage_hapus" on storage.objects;
create policy "dokumen_storage_hapus" on storage.objects
  for delete to authenticated
  using (bucket_id = 'dokumen' and public.is_superadmin());

-- 5. Izin tulis admin untuk konten situs (agar panel admin tetap berfungsi
--    setelah RLS aktif). Publik tetap hanya boleh MEMBACA.
do $$
declare t text;
begin
  foreach t in array array['berita','galeri','site_settings','media','alumni_diskusi'] loop
    if to_regclass('public.' || t) is null then
      raise notice 'Tabel % tidak ada, dilewati', t;
      continue;
    end if;
    execute format('alter table public.%I enable row level security', t);
    if t = 'alumni_diskusi' then
      execute 'drop policy if exists "diskusi_ubah_admin" on public.alumni_diskusi';
      execute 'create policy "diskusi_ubah_admin" on public.alumni_diskusi for update to authenticated using (public.is_admin()) with check (public.is_admin())';
      execute 'drop policy if exists "diskusi_hapus_admin" on public.alumni_diskusi';
      execute 'create policy "diskusi_hapus_admin" on public.alumni_diskusi for delete to authenticated using (public.is_admin())';
    else
      execute format('drop policy if exists "%s_tulis_admin" on public.%I', t, t);
      execute format(
        'create policy "%s_tulis_admin" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
        t, t);
    end if;
  end loop;
end $$;

-- 6. Bucket 'media' (foto situs): tulis hanya admin; baca tetap publik
drop policy if exists "media_storage_tulis_admin" on storage.objects;
create policy "media_storage_tulis_admin" on storage.objects
  for insert to authenticated with check (bucket_id = 'media' and public.is_admin());

drop policy if exists "media_storage_ubah_admin" on storage.objects;
create policy "media_storage_ubah_admin" on storage.objects
  for update to authenticated using (bucket_id = 'media' and public.is_admin());

drop policy if exists "media_storage_hapus_admin" on storage.objects;
create policy "media_storage_hapus_admin" on storage.objects
  for delete to authenticated using (bucket_id = 'media' and public.is_admin());

drop policy if exists "media_storage_baca_publik" on storage.objects;
create policy "media_storage_baca_publik" on storage.objects
  for select using (bucket_id = 'media');

-- ═══════════════════════════════════════════════════════════════════
--  CARA MEMBUAT AKUN ADMIN (disarankan):
--  1) Supabase → Authentication → Users → Add user → isi email + password
--     → centang "Auto Confirm User".
--  2) Daftarkan email yang sama di tabel admin_users:
--       insert into admin_users (username, password_hash, nama, role)
--       values ('email@unsrat.ac.id', 'n/a - pakai Supabase Auth', 'Nama Lengkap', 'admin');
--     (atau lewat tab "Kelola Admin" di admin.html oleh superadmin)
--  Peran 'superadmin' hanya untuk 1–2 orang pengelola.
-- ═══════════════════════════════════════════════════════════════════
