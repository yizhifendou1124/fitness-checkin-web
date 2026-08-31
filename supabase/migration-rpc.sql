-- ============================================================
-- 健身打卡 · 账号数据迁移 RPC
-- 使用方法：Supabase 控制台 → SQL Editor → New query →
--           粘贴本文件全部内容 → Run
-- ============================================================

create or replace function public.copy_checkins_between_emails(
  source_email text,
  target_email text,
  migration_mode text default 'incremental'
)
returns table (
  copied_count integer,
  source_count integer,
  target_before_count integer,
  target_after_count integer
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  source_user_id uuid;
  target_user_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if migration_mode not in ('incremental', 'overwrite') then
    raise exception 'invalid migration mode';
  end if;

  if lower(trim(target_email)) <> 'zxw@fitness.com' then
    raise exception 'target user must be zxw@fitness.com';
  end if;

  select id into source_user_id
  from auth.users
  where lower(email) = lower(trim(source_email))
  limit 1;

  select id into target_user_id
  from auth.users
  where lower(email) = lower(trim(target_email))
  limit 1;

  if source_user_id is null then
    raise exception 'source user not found';
  end if;

  if target_user_id is null then
    raise exception 'target user not found';
  end if;

  if target_user_id <> auth.uid() then
    raise exception 'target user must be the current signed-in user';
  end if;

  if source_user_id = target_user_id then
    raise exception 'source user and target user must be different';
  end if;

  select count(*)::integer into source_count
  from public.checkins
  where user_id = source_user_id;

  select count(*)::integer into target_before_count
  from public.checkins
  where user_id = target_user_id;

  if migration_mode = 'overwrite' then
    delete from public.checkins
    where user_id = target_user_id;
  end if;

  insert into public.checkins (user_id, date)
  select target_user_id, date
  from public.checkins
  where user_id = source_user_id
  on conflict (user_id, date) do nothing;

  get diagnostics copied_count = row_count;

  select count(*)::integer into target_after_count
  from public.checkins
  where user_id = target_user_id;

  return next;
end;
$$;

revoke all on function public.copy_checkins_between_emails(text, text, text) from public;
grant execute on function public.copy_checkins_between_emails(text, text, text) to authenticated;

select pg_notify('pgrst', 'reload schema');
