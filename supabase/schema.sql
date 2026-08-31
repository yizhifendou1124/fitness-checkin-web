-- ============================================================
-- 健身打卡 · Supabase 建表脚本
-- 使用方法：Supabase 控制台 → SQL Editor → 新建查询 →
--           粘贴本文件全部内容 → 点 Run
-- ============================================================

-- 打卡记录表：一个用户某一天最多一条记录
create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date text not null,               -- 打卡日期，格式 YYYY-MM-DD
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

-- 开启行级安全（RLS）：未登录/非本人一律读不到也写不进去
alter table public.checkins enable row level security;

-- 允许用户读取自己的打卡记录
drop policy if exists "Users can read own checkins" on public.checkins;
create policy "Users can read own checkins"
  on public.checkins for select
  using (auth.uid() = user_id);

-- 允许用户新增自己的打卡记录
drop policy if exists "Users can insert own checkins" on public.checkins;
create policy "Users can insert own checkins"
  on public.checkins for insert
  with check (auth.uid() = user_id);

-- 允许用户删除自己的打卡记录
drop policy if exists "Users can delete own checkins" on public.checkins;
create policy "Users can delete own checkins"
  on public.checkins for delete
  using (auth.uid() = user_id);

-- 账号数据迁移函数：
-- - source_email：源账号邮箱
-- - target_email：目标账号邮箱
-- - migration_mode：
--   - incremental：增量复制，只补目标账号没有的日期
--   - overwrite：全量覆盖，先清空目标账号数据再复制源账号数据
-- 安全限制：只能迁移到当前已登录账号，避免任意写入其他用户数据。
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

-- 刷新 Supabase API schema cache，避免前端刚调用 RPC 时提示函数不存在。
select pg_notify('pgrst', 'reload schema');
