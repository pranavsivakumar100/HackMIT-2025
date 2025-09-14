-- Voice presence table to show who is in a voice channel (visible to everyone)
-- Creates a lightweight presence record per (channel_id, user_id)

create table if not exists public.voice_presence (
  channel_id uuid not null references public.channels(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  user_name text not null,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (channel_id, user_id)
);

create index if not exists voice_presence_channel_idx on public.voice_presence(channel_id);

-- Row Level Security
alter table public.voice_presence enable row level security;

-- Anyone authenticated can read who is present in a voice channel
create policy if not exists voice_presence_select on public.voice_presence
  for select
  to authenticated
  using (true);

-- Users can insert their own presence
create policy if not exists voice_presence_insert on public.voice_presence
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Users can update only their own presence row (heartbeat)
create policy if not exists voice_presence_update on public.voice_presence
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Users can delete only their own presence row (on leave)
create policy if not exists voice_presence_delete on public.voice_presence
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Trigger to auto-update updated_at on change
create or replace function public.touch_voice_presence()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end; $$;

drop trigger if exists trg_touch_voice_presence on public.voice_presence;
create trigger trg_touch_voice_presence
before update on public.voice_presence
for each row execute function public.touch_voice_presence();

