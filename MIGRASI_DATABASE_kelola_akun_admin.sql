-- ═══════════════════════════════════════════════════════════════════
--  KELOLA AKUN ADMIN dari panel (ganti/reset password, tambah admin)
--  Jalankan SEKALI di Supabase → SQL Editor → Run. Aman dijalankan ulang.
--  Fungsi hanya bisa dipakai oleh SUPERADMIN (dicek di database).
-- ═══════════════════════════════════════════════════════════════════

-- Reset password admin lain (superadmin saja)
create or replace function public.admin_set_password(target_email text, new_password text)
returns void language plpgsql security definer
set search_path = public, extensions, auth as $$
begin
  if not public.is_superadmin() then raise exception 'Hanya superadmin yang boleh mengatur password.'; end if;
  if length(coalesce(new_password,'')) < 10 then raise exception 'Password minimal 10 karakter.'; end if;
  if not exists (select 1 from public.admin_users where lower(username) = lower(target_email)) then
    raise exception 'Email tersebut bukan admin terdaftar.'; end if;
  update auth.users
     set encrypted_password = crypt(new_password, gen_salt('bf')), updated_at = now()
   where lower(email) = lower(target_email);
  if not found then raise exception 'Akun login untuk email tersebut tidak ditemukan.'; end if;
end $$;

-- Tambah admin baru: membuat akun login + mendaftarkan peran (superadmin saja)
create or replace function public.admin_create_user(p_email text, p_password text, p_nama text, p_role text)
returns void language plpgsql security definer
set search_path = public, extensions, auth as $$
declare v_uid uuid;
begin
  if not public.is_superadmin() then raise exception 'Hanya superadmin yang boleh menambah admin.'; end if;
  if p_role not in ('admin','superadmin') then raise exception 'Peran tidak valid.'; end if;
  if length(coalesce(p_password,'')) < 10 then raise exception 'Password minimal 10 karakter.'; end if;
  if p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Format email tidak valid.'; end if;

  select id into v_uid from auth.users where lower(email) = lower(p_email);
  if v_uid is null then
    v_uid := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token)
    values ('00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
      p_email, crypt(p_password, gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), v_uid, v_uid::text,
      jsonb_build_object('sub', v_uid::text, 'email', p_email), 'email', now(), now(), now());
  else
    update auth.users set encrypted_password = crypt(p_password, gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()), updated_at = now() where id = v_uid;
  end if;

  delete from public.admin_users where lower(username) = lower(p_email);
  insert into public.admin_users (username, password_hash, nama, role)
  values (p_email, 'n/a - pakai Supabase Auth', nullif(p_nama,''), p_role);
end $$;

revoke all on function public.admin_set_password(text, text) from public, anon;
revoke all on function public.admin_create_user(text, text, text, text) from public, anon;
grant execute on function public.admin_set_password(text, text) to authenticated;
grant execute on function public.admin_create_user(text, text, text, text) to authenticated;
