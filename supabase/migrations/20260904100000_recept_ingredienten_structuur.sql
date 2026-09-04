-- =============================================================
-- Recepten: ingrediënten krijgen structuur (hoeveelheid + eenheid +
-- naam) i.p.v. kale vrije tekst per regel. Nodig voor de portie-
-- schaal-teller op het receptdetail en voor een bruikbare
-- boodschappenlijst-generatie (die kon nooit hoeveelheden meenemen
-- zolang een ingrediënt alleen een string was).
--
-- Bestaande ingrediënten (tekst) worden 1-op-1 overgezet naar
-- {naam: <oorspronkelijke tekst>, hoeveelheid: null, eenheid: null} —
-- niemand hoeft data opnieuw in te voeren, hoeveelheid/eenheid zijn
-- gewoon leeg totdat iemand het recept bewerkt.
--
-- Guard op het huidige kolomtype maakt dit veilig om nogmaals te
-- draaien (bv. als handmatige toepassing nodig is omdat de migratie
-- niet vanzelf doorkwam).
-- =============================================================

do $$
begin
  if (
    select data_type from information_schema.columns
    where table_schema = 'public' and table_name = 'recepten' and column_name = 'ingredienten'
  ) = 'ARRAY' then
    alter table public.recepten alter column ingredienten drop default;
    alter table public.recepten alter column ingredienten type jsonb using (
      coalesce(
        (
          select jsonb_agg(jsonb_build_object('naam', elem, 'hoeveelheid', null, 'eenheid', null))
          from unnest(ingredienten) as elem
        ),
        '[]'::jsonb
      )
    );
    alter table public.recepten alter column ingredienten set default '[]'::jsonb;
    alter table public.recepten alter column ingredienten set not null;
  end if;
end $$;
