-- Анонімний облік використання: раз на день пристрій надсилає випадковий ID.
-- Жодних імен, пошти, IP чи даних про дитину. Застосунок може лише ДОДАТИ пінг
-- через функцію public.ping(); читати таблицю анонімні клієнти не можуть.

create table if not exists public.device_pings (
  device_id uuid not null,
  day date not null default (now() at time zone 'Europe/Kyiv')::date,
  installed boolean not null default false,
  primary key (device_id, day)
);

alter table public.device_pings enable row level security;
-- Політик немає: прямий доступ для anon/authenticated закрито.
revoke all on public.device_pings from anon, authenticated;

create or replace function public.ping(p_device uuid, p_installed boolean default false)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.device_pings (device_id, installed)
  values (p_device, coalesce(p_installed, false))
  on conflict (device_id, day) do update set installed = public.device_pings.installed or excluded.installed;
$$;

revoke all on function public.ping(uuid, boolean) from public;
grant execute on function public.ping(uuid, boolean) to anon, authenticated;

-- Зведення для власника (через SQL-редактор / MCP). Анонімам недоступне.
create or replace function public.usage_summary()
returns table (
  devices_total bigint, installed_total bigint,
  dau bigint, wau bigint, mau bigint,
  d7_cohort bigint, d7_retained bigint, d30_cohort bigint, d30_retained bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with today as (select (now() at time zone 'Europe/Kyiv')::date as d),
  first_seen as (select device_id, min(day) as first_day from device_pings group by device_id),
  r7 as (
    -- пристрої, що вперше з'явились 7–13 днів тому; утримані — якщо були активні на 7-й день або пізніше
    select f.device_id,
           exists (select 1 from device_pings p where p.device_id = f.device_id and p.day >= f.first_day + 7) as kept
    from first_seen f, today t where f.first_day between t.d - 13 and t.d - 7
  ),
  r30 as (
    select f.device_id,
           exists (select 1 from device_pings p where p.device_id = f.device_id and p.day >= f.first_day + 30) as kept
    from first_seen f, today t where f.first_day between t.d - 59 and t.d - 30
  )
  select
    (select count(*) from first_seen),
    (select count(distinct device_id) from device_pings where installed),
    (select count(distinct device_id) from device_pings, today where day = today.d),
    (select count(distinct device_id) from device_pings, today where day > today.d - 7),
    (select count(distinct device_id) from device_pings, today where day > today.d - 30),
    (select count(*) from r7), (select count(*) filter (where kept) from r7),
    (select count(*) from r30), (select count(*) filter (where kept) from r30);
$$;

revoke all on function public.usage_summary() from public, anon, authenticated;
