create extension if not exists pg_net with schema extensions;

create or replace function public.klusje_push_webhook()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text := 'https://vkfszoqjpbnvokqkajfc.supabase.co/functions/v1/send-push';
begin
  perform net.http_post(
    url := v_url,
    body := jsonb_build_object(
      'type', tg_op,
      'table', tg_table_name,
      'schema', tg_table_schema,
      'record', to_jsonb(new),
      'old_record', case when tg_op = 'UPDATE' then to_jsonb(old) else null end
    ),
    headers := jsonb_build_object('content-type', 'application/json')
  );
  return new;
end;
$$;

revoke all on function public.klusje_push_webhook() from public, anon, authenticated;

drop trigger if exists klusjes_push_webhook on public.klusjes;
create trigger klusjes_push_webhook
  after insert or update on public.klusjes
  for each row execute function public.klusje_push_webhook();