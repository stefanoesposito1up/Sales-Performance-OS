
-- 1. PROFILES (Extends auth.users)
create table public.profiles (
  user_id uuid not null references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  role text not null check (role in ('admin', 'coach', 'member')) default 'member',
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. TEAM EDGES (Hierarchy with History)
create table public.team_edges (
  id bigint generated always as identity primary key,
  child_id uuid not null references public.profiles(user_id) on delete cascade,
  parent_id uuid references public.profiles(user_id) on delete set null, -- Null means root/no sponsor
  valid_from timestamptz not null default now(),
  valid_to timestamptz, -- Null means currently active
  created_by uuid references public.profiles(user_id),
  created_at timestamptz default now()
);

-- Constraint: Only one active parent per child
create unique index unique_active_parent on public.team_edges (child_id) where valid_to is null;

-- 3. DAILY LOGS (Updated with user_id)
create table public.daily_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  date date not null,
  
  -- Outreach
  calls_refused int default 0,
  calls_no_answer int default 0,
  calls_answered int default 0,
  messages_sent int default 0,

  -- Booked
  booked_la int default 0,
  booked_fv int default 0,
  booked_cad int default 0,

  -- Leads
  new_leads int default 0,

  -- Done
  done_la int default 0,
  done_fv int default 0,
  done_cad int default 0,
  done_cde int default 0,

  -- Won
  won_la int default 0,
  won_fv int default 0,
  won_cad int default 0,

  -- Mental
  energy_level int default 0,
  focus_level int default 0,
  confidence_level int default 0,
  mood_note text,

  -- Targets Snapshot (Optional, to keep history of targets at that time)
  target_calls int default 0,
  target_booked int default 0,
  target_won int default 0,

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(user_id, date)
);

-- 4. MONTHLY PLANS (SIMPLIFIED & FIXED)
drop table if exists public.monthly_plans cascade;

create table public.monthly_plans (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null, -- YYYY-MM
  
  -- User Inputs
  workdays_per_week int not null default 5,
  target_won_la_month int not null default 0,
  target_won_fv_month int not null default 0,
  target_won_cad_month int not null default 0,

  -- Standard Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- Constraint for UPSERT
  unique(user_id, month)
);

-- 5. FUNCTION: Get Downline (Recursive)
create or replace function public.get_downline(root_id uuid)
returns setof uuid
language sql
security definer
stable
as $$
  with recursive downline as (
    -- Anchor member: the user themselves
    select user_id from public.profiles where user_id = root_id
    union
    -- Recursive member: children of current level
    select e.child_id
    from public.team_edges e
    inner join downline d on e.parent_id = d.user_id
    where e.valid_to is null
  )
  select user_id from downline;
$$;

-- 6. RLS POLICIES
alter table public.profiles enable row level security;
alter table public.team_edges enable row level security;
alter table public.daily_logs enable row level security;
alter table public.monthly_plans enable row level security;

-- Helper function to check if user is admin
create or replace function public.is_admin()
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

-- PROFILES Policies
create policy "Admins can view all profiles" on public.profiles for select using (is_admin());
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = user_id);
create policy "Coaches can view downline profiles" on public.profiles for select using (
  user_id in (select get_downline(auth.uid()))
);
-- Allow system/trigger to insert
create policy "Enable insert for authenticated users only" on "public"."profiles" as PERMISSIVE for INSERT to authenticated with check (true);
create policy "Admins can update profiles" on public.profiles for update using (is_admin());

-- TEAM EDGES Policies
create policy "Admins can manage edges" on public.team_edges for all using (is_admin());
create policy "Coaches can view downline edges" on public.team_edges for select using (
  (child_id in (select get_downline(auth.uid()))) or (parent_id = auth.uid())
);
create policy "Users can view own parent edge" on public.team_edges for select using (child_id = auth.uid());

-- DAILY LOGS Policies
create policy "Admins can view all logs" on public.daily_logs for select using (is_admin());
create policy "Coaches can view downline logs" on public.daily_logs for select using (
  user_id in (select get_downline(auth.uid()))
);
create policy "Users can CRUD own logs" on public.daily_logs for all using (auth.uid() = user_id);

-- MONTHLY PLANS Policies (FIXED FOR UPSERT)
create policy "Admins can view all plans" on public.monthly_plans for select using (is_admin());

create policy "Users can select own plans" on public.monthly_plans for select using (auth.uid() = user_id);

create policy "Users can insert own plans" on public.monthly_plans for insert with check (auth.uid() = user_id);

create policy "Users can update own plans" on public.monthly_plans for update using (auth.uid() = user_id);

create policy "Users can delete own plans" on public.monthly_plans for delete using (auth.uid() = user_id);


-- 7. TRIGGERS

-- A) Update updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
   new.updated_at = now();
   return new;
end;
$$ language 'plpgsql';

create trigger update_profiles_updated_at before update on public.profiles for each row execute procedure update_updated_at_column();
create trigger update_logs_updated_at before update on public.daily_logs for each row execute procedure update_updated_at_column();
create trigger update_plans_updated_at before update on public.monthly_plans for each row execute procedure update_updated_at_column();

-- B) HANDLE NEW USER (Auto-create Profile + First User Admin)
create or replace function public.handle_new_user()
returns trigger as $$
declare
  is_first boolean;
begin
  -- Check if this is the very first user in the system
  select count(*) = 0 into is_first from public.profiles;
  
  insert into public.profiles (user_id, email, full_name, role)
  values (
    new.id, 
    new.email, 
    coalesce(new.raw_user_meta_data->>'full_name', 'Nuovo Utente'),
    -- First user is Admin, others Member
    case when is_first then 'admin' else 'member' end
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger on Auth table
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
