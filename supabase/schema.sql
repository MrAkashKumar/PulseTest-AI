-- Run once in the Supabase SQL editor, then enable Anonymous Sign-Ins under
-- Authentication > Providers. Upgrade to a durable login for multi-device sync.
create table if not exists public.exams (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists exams_owner_id_idx on public.exams(owner_id);
alter table public.exams enable row level security;

create policy "owners can read their study content"
on public.exams for select to authenticated
using (auth.uid() = owner_id);

create policy "owners can insert their study content"
on public.exams for insert to authenticated
with check (auth.uid() = owner_id);

create policy "owners can update their study content"
on public.exams for update to authenticated
using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "owners can delete their study content"
on public.exams for delete to authenticated
using (auth.uid() = owner_id);

create table if not exists public.research_snapshots (
  id bigint generated always as identity primary key,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.research_snapshots enable row level security;
create policy "public research read"
on public.research_snapshots for select to anon
using (true);
