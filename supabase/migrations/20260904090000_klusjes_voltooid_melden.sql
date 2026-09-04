-- =============================================================
-- Klusjes: meld de aanmaker wanneer zijn/haar klusje wordt voltooid.
-- Triggert op klus_voltooiingen (niet op klusjes.afgerond), omdat een
-- terugkerend klusje bij het afvinken direct weer op afgerond=false
-- wordt gezet (nieuwe cyclus) — de rij in klus_voltooiingen is het
-- enige betrouwbare signaal dat iemand het net heeft afgerond, voor
-- zowel eenmalige als terugkerende klusjes.
--
-- Geen melding als de aanmaker zelf ook degene is die afvinkt (niet
-- jezelf feliciteren), of als het klusje geen bekende aanmaker heeft.
-- =============================================================

create or replace function public.klusje_voltooiing_melden()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_created_by uuid;
  v_titel text;
  v_door_naam text;
begin
  select created_by, titel into v_created_by, v_titel
  from public.klusjes
  where id = new.klusje_id;

  if v_created_by is null or v_created_by = new.toegewezen_aan then
    return new;
  end if;

  select naam into v_door_naam from public.profiles where id = new.toegewezen_aan;

  insert into public.meldingen (gezin_id, profiel_id, type, payload)
  values (
    new.gezin_id,
    v_created_by,
    'klusje_voltooid',
    jsonb_build_object('klusje_id', new.klusje_id, 'titel', v_titel, 'door', v_door_naam)
  );
  return new;
end;
$$;

drop trigger if exists klus_voltooiingen_melden on public.klus_voltooiingen;
create trigger klus_voltooiingen_melden
  after insert on public.klus_voltooiingen
  for each row execute function public.klusje_voltooiing_melden();

-- Hergebruikt de generieke webhook-functie die Fase D al voor klusjes
-- aanmaakte (stuurt tabel/record door naar de send-push Edge Function)
-- — dezelfde functie werkt ongewijzigd voor deze tabel.
drop trigger if exists klus_voltooiingen_push_webhook on public.klus_voltooiingen;
create trigger klus_voltooiingen_push_webhook
  after insert on public.klus_voltooiingen
  for each row execute function public.klusje_push_webhook();
