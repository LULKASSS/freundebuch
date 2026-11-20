-- Eine Liste, über die schon etwas reserviert wurde, lässt sich nicht löschen (nur abschließen).
-- Sonst verschwänden mit ihr die Reservierungen, und ein Wunsch, der auch auf einer anderen Liste
-- steht, wäre dort wieder frei: doppelt geschenkt. Die Zahl „vergeben“ kenne ich ohnehin, die
-- Ablehnung verrät also nichts Neues.
-- Wird das ganze Konto gelöscht (Etappe 3), ist die Kontozeile schon weg; dann darf alles mit.

create function public.liste_loeschen_pruefen() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if exists (select 1 from public.konto where id = old.konto_id)
     and exists (select 1 from public.reservierung where liste_id = old.id) then
    raise exception 'liste_vergeben' using errcode = '23503',
      hint = 'Auf dieser Liste ist schon etwas vergeben. Abschließen statt löschen.';
  end if;
  return old;
end $$;
revoke all on function public.liste_loeschen_pruefen() from public, anon, authenticated;

create trigger liste_loeschen_pruefen before delete on public.liste
  for each row execute function public.liste_loeschen_pruefen();
