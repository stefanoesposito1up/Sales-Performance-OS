
-- 1. CLEANUP (Solo per setup pulito, rimuovi se vuoi mantenere dati)
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop table if exists public.invites;
-- Nota: profiles e daily_logs vengono adattati, non droppati se esistenti, per sicurezza.

-- 2. TABELLA PROFILES (Estesa)
create table if not exists public.profiles (
  user_id uuid not null references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  role text not null check (role in ('admin', 'leader', 'collaboratore')) default 'collaboratore',
  team_id uuid, -- ID del team (può essere l'ID del leader o un ID gruppo astratto)
  leader_id uuid references public.profiles(user_id), -- Riferimento diretto al leader
  status text check (status in ('active', 'inactive')) default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. TABELLA INVITES
create table public.invites (
  code text primary key,
  role_assigned text check (role_assigned in ('admin', 'leader', 'collaboratore')) not null,
  team_id_assigned uuid,
  leader_id_assigned uuid references public.profiles(user_id),
  max_uses int default 1,
  uses_count int default 0,
  expires_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  is_active boolean default true
);

-- 4. FUNZIONE DI REGISTRAZIONE SICURA (Trigger)
-- Questa funzione viene eseguita PRIMA che l'utente venga confermato nel DB.
-- Se il codice invito non è valido, solleva un'eccezione che blocca la registrazione.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer -- Esegue con permessi di sistema (necessario per leggere invites)
as $$
declare
  invite_code text;
  invite_record record;
  is_first_user boolean;
begin
  -- Recupera il codice invito dai metadati inviati dal frontend
  invite_code := new.raw_user_meta_data->>'invite_code';

  -- Controllo speciale: Se è il primo utente assoluto, diventa ADMIN senza invito
  select count(*) = 0 into is_first_user from public.profiles;
  
  if is_first_user then
      insert into public.profiles (user_id, email, full_name, role, status)
      values (
        new.id, 
        new.email, 
        coalesce(new.raw_user_meta_data->>'full_name', 'Super Admin'),
        'admin',
        'active'
      );
      return new;
  end if;

  -- Validazione Codice Invito
  if invite_code is null then
      raise exception 'Codice invito mancante.';
  end if;

  select * into invite_record from public.invites where code = invite_code;

  if invite_record is null then
      raise exception 'Codice invito non valido.';
  end if;

  if invite_record.is_active = false or (invite_record.expires_at is not null and invite_record.expires_at < now()) then
      raise exception 'Codice invito scaduto o disattivato.';
  end if;

  if invite_record.uses_count >= invite_record.max_uses then
      raise exception 'Codice invito esaurito.';
  end if;

  -- Creazione Profilo con dati dall'invito
  insert into public.profiles (user_id, email, full_name, role, team_id, leader_id, status)
  values (
    new.id, 
    new.email, 
    coalesce(new.raw_user_meta_data->>'full_name', 'Nuovo Utente'),
    invite_record.role_assigned,
    invite_record.team_id_assigned,
    invite_record.leader_id_assigned,
    'active'
  );

  -- Aggiornamento contatore invito
  update public.invites 
  set uses_count = uses_count + 1,
      is_active = (uses_count + 1 < max_uses) -- Disattiva se raggiunto limite
  where code = invite_code;

  return new;
end;
$$;

-- Collega il trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 5. ROW LEVEL SECURITY (RLS)

-- Abilita RLS
alter table public.profiles enable row level security;
alter table public.invites enable row level security;
alter table public.daily_logs enable row level security; -- Assumendo che esista dai passaggi precedenti

-- Helper Function: Check Admin
create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.profiles where user_id = auth.uid() and role = 'admin');
$$;

-- Helper Function: Check Leader of User
create or replace function public.is_leader_of(target_user_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.profiles 
    where user_id = auth.uid() 
    and role = 'leader' 
    and team_id = (select team_id from public.profiles where user_id = target_user_id)
  );
$$;

-- POLICIES: PROFILES
create policy "Admin full access profiles" on public.profiles for all using (public.is_admin());

create policy "Users read own profile" on public.profiles for select using (auth.uid() = user_id);

create policy "Leaders read team profiles" on public.profiles for select using (
  auth.uid() = leader_id or -- Sono il leader diretto
  (role != 'admin' and team_id = (select team_id from public.profiles where user_id = auth.uid()) and (select role from public.profiles where user_id = auth.uid()) = 'leader')
);

create policy "Users update own profile basic info" on public.profiles for update using (auth.uid() = user_id);

-- POLICIES: INVITES
create policy "Admin manage invites" on public.invites for all using (public.is_admin());
-- Nessun altro può vedere o toccare la tabella invites (La sicurezza è gestita dal trigger `security definer`)

-- POLICIES: DATI (Esempio su Daily Logs)
-- Assumiamo che daily_logs abbia una colonna user_id
create policy "Admin full access logs" on public.daily_logs for all using (public.is_admin());

create policy "Users CRUD own logs" on public.daily_logs for all using (auth.uid() = user_id);

create policy "Leaders read team logs" on public.daily_logs for select using (
  exists (
    select 1 from public.profiles p
    where p.user_id = public.daily_logs.user_id
    and p.leader_id = auth.uid()
  )
);

-- Aggiorna permessi tabelle esistenti (Monthly Plans, etc) con logica simile
alter table public.monthly_plans enable row level security;
create policy "Admin plans" on public.monthly_plans for all using (public.is_admin());
create policy "User plans" on public.monthly_plans for all using (auth.uid() = user_id);
create policy "Leader view plans" on public.monthly_plans for select using (
  exists (select 1 from public.profiles p where p.user_id = public.monthly_plans.user_id and p.leader_id = auth.uid())
);

