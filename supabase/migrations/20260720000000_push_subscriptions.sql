create table public.push_subscriptions (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles on delete cascade, endpoint text not null unique, p256dh text not null, auth text not null, user_agent text, created_at timestamptz default now(), updated_at timestamptz default now());
create index push_subscriptions_user_idx on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;
create policy "users read own push subscriptions" on public.push_subscriptions for select to authenticated using(user_id=auth.uid());
create policy "users delete own push subscriptions" on public.push_subscriptions for delete to authenticated using(user_id=auth.uid());
