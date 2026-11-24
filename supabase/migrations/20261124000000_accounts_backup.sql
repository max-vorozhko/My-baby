-- Акаунти (вхід через Google): резервна копія щоденника в хмарі + облік зареєстрованих у статистиці.

-- 1. Резервна копія: один рядок на акаунт, увесь щоденник у JSON (без фото й аудіо).
create table if not exists public.backups (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null,
  records    integer not null default 0,
  device_id  uuid,
  updated_at timestamptz not null default now(),
  constraint backups_size check (pg_column_size(data) < 10000000)
);

alter table public.backups enable row level security;

-- Лише власник і лише справжній (не анонімний) акаунт. Одна сім'я не бачить іншу.
create policy backups_own on public.backups
  for all
  to authenticated
  using ((select auth.uid()) = user_id and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false)
  with check ((select auth.uid()) = user_id and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

revoke all on public.backups from anon;
grant select, insert, update, delete on public.backups to authenticated;

-- 2. Щоденний пінг: тепер ще й «чи увійшов через Google» (без пошти й id акаунта).
alter table public.device_pings add column if not exists signed_in boolean not null default false;

drop function if exists public.ping(uuid, boolean);
create or replace function public.ping(p_device uuid, p_installed boolean default false, p_signed_in boolean default false)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.device_pings (device_id, installed, signed_in)
  values (p_device, coalesce(p_installed, false), coalesce(p_signed_in, false))
  on conflict (device_id, day) do update
    set installed = public.device_pings.installed or excluded.installed,
        signed_in = public.device_pings.signed_in or excluded.signed_in;
$$;

revoke all on function public.ping(uuid, boolean, boolean) from public;
grant execute on function public.ping(uuid, boolean, boolean) to anon, authenticated;

-- 3. Зведення: додано зареєстрованих.
--   registered_total — акаунти Google (з auth.users, не залежить від перемикача статистики);
--   devices_signed_in — пристрої, що хоч раз були з входом; mau_registered / mau_guest — активні за 30 днів.
drop function if exists public.usage_summary();
create or replace function public.usage_summary()
returns table (
  devices_total bigint, installed_total bigint,
  dau bigint, wau bigint, mau bigint,
  d7_cohort bigint, d7_retained bigint, d30_cohort bigint, d30_retained bigint,
  registered_total bigint, devices_signed_in bigint, mau_registered bigint, mau_guest bigint
)
language sql
stable
security definer
set search_path = public, auth
as $$
  with today as (select (now() at time zone 'Europe/Kyiv')::date as d),
  first_seen as (select device_id, min(day) as first_day from device_pings group by device_id),
  r7 as (
    select f.device_id,
           exists (select 1 from device_pings p where p.device_id = f.device_id and p.day >= f.first_day + 7) as kept
    from first_seen f, today t where f.first_day between t.d - 13 and t.d - 7
  ),
  r30 as (
    select f.device_id,
           exists (select 1 from device_pings p where p.device_id = f.device_id and p.day >= f.first_day + 30) as kept
    from first_seen f, today t where f.first_day between t.d - 59 and t.d - 30
  ),
  m30 as (
    select device_id, bool_or(signed_in) as signed
    from device_pings, today where day > today.d - 30 group by device_id
  )
  select
    (select count(*) from first_seen),
    (select count(distinct device_id) from device_pings where installed),
    (select count(distinct device_id) from device_pings, today where day = today.d),
    (select count(distinct device_id) from device_pings, today where day > today.d - 7),
    (select count(*) from m30),
    (select count(*) from r7), (select count(*) filter (where kept) from r7),
    (select count(*) from r30), (select count(*) filter (where kept) from r30),
    (select count(*) from auth.users where not coalesce(is_anonymous, false)),
    (select count(distinct device_id) from device_pings where signed_in),
    (select count(*) filter (where signed) from m30),
    (select count(*) filter (where not signed) from m30);
$$;

revoke all on function public.usage_summary() from public, anon, authenticated;
