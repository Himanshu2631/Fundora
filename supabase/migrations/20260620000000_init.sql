-- ==========================================
-- FUNDORA INITIAL DATABASE SCHEMA MIGRATION
-- ==========================================

-- 1. Helper Security Definer Functions (to prevent RLS policy recursion)
create or replace function public.is_admin(user_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = user_id and role = 'admin'
  );
end;
$$ language plpgsql security definer;


-- 2. Table: profiles
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  role text default 'user' not null check (role in ('user', 'admin')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for profiles
alter table public.profiles enable row level security;


-- 3. Table: subscriptions
create table public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  plan_type text not null check (plan_type in ('scout', 'advocate', 'builder')),
  status text not null check (status in ('active', 'canceled', 'past_due')),
  renewal_date timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for subscriptions
alter table public.subscriptions enable row level security;


-- 4. Table: scores
create table public.scores (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  score integer not null default 0,
  score_date date not null default current_date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for scores
alter table public.scores enable row level security;


-- 5. Table: charities
create table public.charities (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text not null,
  image_url text,
  featured boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for charities
alter table public.charities enable row level security;


-- 6. Table: draws
create table public.draws (
  id uuid default gen_random_uuid() primary key,
  month text not null, -- format: YYYY-MM
  winning_numbers integer[],
  status text not null default 'upcoming' check (status in ('upcoming', 'drawn', 'cancelled')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for draws
alter table public.draws enable row level security;


-- 7. Table: draw_entries
create table public.draw_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  draw_id uuid references public.draws(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_user_draw unique (user_id, draw_id)
);

-- Enable RLS for draw_entries
alter table public.draw_entries enable row level security;


-- 8. Table: winner_submissions
create table public.winner_submissions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  draw_id uuid references public.draws(id) on delete cascade not null,
  screenshot_url text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for winner_submissions
alter table public.winner_submissions enable row level security;


-- 9. Table: payments
create table public.payments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount numeric(10, 2) not null check (amount >= 0),
  status text not null check (status in ('succeeded', 'failed', 'pending')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for payments
alter table public.payments enable row level security;


-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Profiles policies
create policy "Profiles are viewable by authenticated users" 
  on public.profiles for select using (auth.role() = 'authenticated');

create policy "Users can update their own profile" 
  on public.profiles for update using (auth.uid() = id);

create policy "Admins have full access on profiles" 
  on public.profiles for all using (public.is_admin(auth.uid()));

-- Subscriptions policies
create policy "Users can view their own subscriptions" 
  on public.subscriptions for select using (auth.uid() = user_id);

create policy "Admins have full access on subscriptions" 
  on public.subscriptions for all using (public.is_admin(auth.uid()));

-- Scores policies
create policy "Scores are viewable by authenticated users" 
  on public.scores for select using (auth.role() = 'authenticated');

create policy "Admins have full access on scores" 
  on public.scores for all using (public.is_admin(auth.uid()));

-- Charities policies
create policy "Charities are viewable by everyone" 
  on public.charities for select using (true);

create policy "Admins have full access on charities" 
  on public.charities for all using (public.is_admin(auth.uid()));

-- Draws policies
create policy "Draws are viewable by authenticated users" 
  on public.draws for select using (auth.role() = 'authenticated');

create policy "Admins have full access on draws" 
  on public.draws for all using (public.is_admin(auth.uid()));

-- Draw Entries policies
create policy "Users can view their own draw entries" 
  on public.draw_entries for select using (auth.uid() = user_id);

create policy "Users can register themselves for a draw" 
  on public.draw_entries for insert with check (auth.uid() = user_id);

create policy "Admins have full access on draw entries" 
  on public.draw_entries for all using (public.is_admin(auth.uid()));

-- Winner Submissions policies
create policy "Users can view their own winner submissions" 
  on public.winner_submissions for select using (auth.uid() = user_id);

create policy "Users can create their own winner submissions" 
  on public.winner_submissions for insert with check (auth.uid() = user_id);

create policy "Admins have full access on winner submissions" 
  on public.winner_submissions for all using (public.is_admin(auth.uid()));

-- Payments policies
create policy "Users can view their own payments" 
  on public.payments for select using (auth.uid() = user_id);

create policy "Admins have full access on payments" 
  on public.payments for all using (public.is_admin(auth.uid()));


-- ==========================================
-- DATABASE PERFORMANCE INDEXES
-- ==========================================
create index idx_profiles_role on public.profiles(role);

create index idx_subscriptions_user_id on public.subscriptions(user_id);
create index idx_subscriptions_status on public.subscriptions(status);

create index idx_scores_user_id on public.scores(user_id);
create index idx_scores_sort on public.scores(score desc, score_date desc);

create index idx_charities_featured on public.charities(featured);

create index idx_draws_month on public.draws(month);
create index idx_draws_status on public.draws(status);

create index idx_draw_entries_user_id on public.draw_entries(user_id);
create index idx_draw_entries_draw_id on public.draw_entries(draw_id);

create index idx_winner_submissions_user_id on public.winner_submissions(user_id);
create index idx_winner_submissions_draw_id on public.winner_submissions(draw_id);

create index idx_payments_user_id on public.payments(user_id);
create index idx_payments_created_at on public.payments(created_at);


-- ==========================================
-- PROFILE SYNC TRIGGER FUNCTIONS
-- ==========================================

-- Trigger function to automatically create a profile after signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'user'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger attachment
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
