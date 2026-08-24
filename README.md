# Family Connect

Maak een nieuw project met Supabase (Lovable Cloud) aan voor een gezinsapp.
Ik wil dat je uitsluitend de backend opzet — het databaseschema en auth — 
exact zoals hieronder gespecificeerd. Bouw geen eigen UI/pagina's; een 
minimale placeholder-pagina is voldoende, de frontend bouw ik apart.

Voer onderstaande SQL-migratie exact uit zoals ze hier staat, zonder ze 
te herschrijven of "verbeteren":

-- =============================================================
-- Fase 1 — Fundament: gezinnen, profielen met rol (ouder/kind),
-- en een veilige manier om een gezin aan te maken of via een
-- uitnodigingscode aan te sluiten.
-- =============================================================

create extension if not exists pgcrypto;

create type public.app_rol as enum ('ouder', 'kind');

create table public.gezinnen (
  id uuid primary key default gen_random_uuid(),
  naam text not null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  gezin_id uuid references public.gezinnen(id) on delete set null,
  naam text not null,
  rol public.app_rol not null default 'ouder',
  avatar_initial text,
  created_at timestamptz not null default now()
);

create table public.gezin_uitnodigingen (
  id uuid primary key default gen_random_uuid(),
  gezin_id uuid not null references public.gezinnen(id) on delete cascade,
  code text not null unique,
  rol public.app_rol not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  gebruikt_door uuid references auth.users(id) on delete set null,
  gebruikt_op timestamptz
);

create or replace function public.current_gezin_id()
returns uuid
language sql
stable security definer
set search_path = public
as $$
  select gezin_id from public.profiles where id = auth.uid()
$$;

create or replace function public.current_rol()
returns public.app_rol
language sql
stable security definer
set search_path = public
as $$
  select rol from public.profiles where id = auth.uid()
$$;

revoke execute on function public.current_gezin_id() from public, anon;
grant execute on function public.current_gezin_id() to authenticated;
revoke execute on function public.current_rol() from public, anon;
grant execute on function public.current_rol() to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, naam)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.gezin_aanmaken(p_naam text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gezin_id uuid;
  v_huidig uuid;
begin
  select gezin_id into v_huidig from public.profiles where id = auth.uid();
  if v_huidig is not null then
    raise exception 'Je hoort al bij een gezin.';
  end if;
  if coalesce(trim(p_naam), '') = '' then
    raise exception 'Geef het gezin een naam.';
  end if;

  insert into public.gezinnen (naam) values (trim(p_naam)) returning id into v_gezin_id;
  update public.profiles set gezin_id = v_gezin_id, rol = 'ouder' where id = auth.uid();

  return v_gezin_id;
end;
$$;

create or replace function public.gezin_uitnodiging_aanmaken(p_rol public.app_rol)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gezin_id uuid := public.current_gezin_id();
  v_code text;
begin
  if v_gezin_id is null then
    raise exception 'Je hoort nog niet bij een gezin.';
  end if;
  if public.current_rol() <> 'ouder' then
    raise exception 'Alleen ouders kunnen uitnodigingen aanmaken.';
  end if;

  v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
  insert into public.gezin_uitnodigingen (gezin_id, code, rol, created_by)
    values (v_gezin_id, v_code, p_rol, auth.uid());

  return v_code;
end;
$$;

create or replace function public.gezin_lid_worden(p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uitnodiging public.gezin_uitnodigingen%rowtype;
  v_huidig uuid;
begin
  select gezin_id into v_huidig from public.profiles where id = auth.uid();
  if v_huidig is not null then
    raise exception 'Je hoort al bij een gezin.';
  end if;

  select * into v_uitnodiging
    from public.gezin_uitnodigingen
    where code = upper(trim(p_code)) and gebruikt_door is null
    for update;

  if not found then
    raise exception 'Ongeldige of al gebruikte code.';
  end if;

  update public.profiles
    set gezin_id = v_uitnodiging.gezin_id, rol = v_uitnodiging.rol
    where id = auth.uid();

  update public.gezin_uitnodigingen
    set gebruikt_door = auth.uid(), gebruikt_op = now()
    where id = v_uitnodiging.id;
end;
$$;

revoke execute on function public.gezin_aanmaken(text) from public, anon;
grant execute on function public.gezin_aanmaken(text) to authenticated;
revoke execute on function public.gezin_uitnodiging_aanmaken(public.app_rol) from public, anon;
grant execute on function public.gezin_uitnodiging_aanmaken(public.app_rol) to authenticated;
revoke execute on function public.gezin_lid_worden(text) from public, anon;
grant execute on function public.gezin_lid_worden(text) to authenticated;

grant select, update on public.gezinnen to authenticated;
grant all on public.gezinnen to service_role;
alter table public.gezinnen enable row level security;

create policy "gezinnen_select_own" on public.gezinnen for select to authenticated
  using (id = public.current_gezin_id());
create policy "gezinnen_update_own_ouder" on public.gezinnen for update to authenticated
  using (id = public.current_gezin_id() and public.current_rol() = 'ouder')
  with check (id = public.current_gezin_id() and public.current_rol() = 'ouder');

grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create policy "profiles_select_self_or_gezin" on public.profiles for select to authenticated
  using (auth.uid() = id or gezin_id = public.current_gezin_id());
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and gezin_id is not distinct from public.current_gezin_id()
    and rol is not distinct from public.current_rol()
  );

grant select on public.gezin_uitnodigingen to authenticated;
grant all on public.gezin_uitnodigingen to service_role;
alter table public.gezin_uitnodigingen enable row level security;

create policy "uitnodigingen_select_eigen_gezin_ouder" on public.gezin_uitnodigingen for select to authenticated
  using (gezin_id = public.current_gezin_id() and public.current_rol() = 'ouder');

Zet daarnaast in Authentication de providers "Email" en "Google" aan.

Als dit gelukt is: bevestig dat de migratie zonder fouten is uitgevoerd 
en laat de Project URL en publishable/anon key zien (Project Settings → API).

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://kinfolk-nest-back.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4b7776d0-bded-4cb2-b1d1-78fc1041a7f3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
