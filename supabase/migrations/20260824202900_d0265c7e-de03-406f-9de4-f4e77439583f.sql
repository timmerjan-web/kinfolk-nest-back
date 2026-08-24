-- Harden SECURITY DEFINER functions: explicit auth checks + least-privilege EXECUTE

CREATE OR REPLACE FUNCTION public.current_gezin_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select gezin_id from public.profiles where id = auth.uid()
$function$;

CREATE OR REPLACE FUNCTION public.current_rol()
 RETURNS app_rol
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select rol from public.profiles where id = auth.uid()
$function$;

CREATE OR REPLACE FUNCTION public.gezin_aanmaken(p_naam text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_gezin_id uuid;
  v_huidig uuid;
begin
  if auth.uid() is null then
    raise exception 'Niet ingelogd.';
  end if;

  select gezin_id into v_huidig from public.profiles where id = auth.uid();
  if v_huidig is not null then
    raise exception 'Je hoort al bij een gezin.';
  end if;
  if coalesce(trim(p_naam), '') = '' then
    raise exception 'Geef het gezin een naam.';
  end if;
  if length(trim(p_naam)) > 80 then
    raise exception 'Gezinsnaam is te lang.';
  end if;

  insert into public.gezinnen (naam) values (trim(p_naam)) returning id into v_gezin_id;
  update public.profiles set gezin_id = v_gezin_id, rol = 'ouder' where id = auth.uid();

  return v_gezin_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.gezin_lid_worden(p_code text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uitnodiging public.gezin_uitnodigingen%rowtype;
  v_huidig uuid;
begin
  if auth.uid() is null then
    raise exception 'Niet ingelogd.';
  end if;

  select gezin_id into v_huidig from public.profiles where id = auth.uid();
  if v_huidig is not null then
    raise exception 'Je hoort al bij een gezin.';
  end if;

  if coalesce(trim(p_code), '') = '' or length(trim(p_code)) > 12 then
    raise exception 'Ongeldige of al gebruikte code.';
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
$function$;

CREATE OR REPLACE FUNCTION public.gezin_uitnodiging_aanmaken(p_rol app_rol)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_gezin_id uuid;
  v_code text;
begin
  if auth.uid() is null then
    raise exception 'Niet ingelogd.';
  end if;

  v_gezin_id := public.current_gezin_id();
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
$function$;

-- Least privilege: no anonymous / PUBLIC execution
REVOKE ALL ON FUNCTION public.current_gezin_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_rol() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.gezin_aanmaken(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.gezin_lid_worden(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.gezin_uitnodiging_aanmaken(app_rol) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.current_gezin_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_rol() TO authenticated;
GRANT EXECUTE ON FUNCTION public.gezin_aanmaken(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gezin_lid_worden(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gezin_uitnodiging_aanmaken(app_rol) TO authenticated;