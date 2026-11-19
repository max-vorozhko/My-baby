-- Облік генерацій казок: ліміт на користувача й загальний денний ліміт (захист бюджету).
create table if not exists public.story_usage (
  user_id text not null,
  day     date not null,
  count   integer not null default 0,
  primary key (user_id, day)
);

-- RLS увімкнено без жодних політик: таблиця доступна лише service_role (Edge Function).
alter table public.story_usage enable row level security;

-- Атомарно займає слот: спершу загальний, потім користувацький. Якщо ліміт вичерпано — нічого не змінює.
create or replace function public.consume_story_quota(p_user text, p_user_limit int, p_global_limit int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := (now() at time zone 'utc')::date;
  v_global int;
  v_user int;
begin
  insert into story_usage (user_id, day, count) values ('__global__', v_day, 1)
  on conflict (user_id, day) do update set count = story_usage.count + 1
    where story_usage.count < p_global_limit
  returning count into v_global;

  if v_global is null then
    return jsonb_build_object('ok', false, 'reason', 'global');
  end if;

  insert into story_usage (user_id, day, count) values (p_user, v_day, 1)
  on conflict (user_id, day) do update set count = story_usage.count + 1
    where story_usage.count < p_user_limit
  returning count into v_user;

  if v_user is null then
    update story_usage set count = count - 1 where user_id = '__global__' and day = v_day;
    return jsonb_build_object('ok', false, 'reason', 'user');
  end if;

  return jsonb_build_object('ok', true, 'used', v_user, 'left', p_user_limit - v_user);
end;
$$;

-- Повертає слот, якщо генерація не вдалася з нашої чи upstream-вини.
create or replace function public.refund_story_quota(p_user text)
returns void
language sql
security definer
set search_path = public
as $$
  update story_usage set count = greatest(0, count - 1)
  where day = (now() at time zone 'utc')::date and user_id in (p_user, '__global__');
$$;

revoke all on function public.consume_story_quota(text, int, int) from public, anon, authenticated;
revoke all on function public.refund_story_quota(text) from public, anon, authenticated;
grant execute on function public.consume_story_quota(text, int, int) to service_role;
grant execute on function public.refund_story_quota(text) to service_role;
