-- Helper: does the calling auth user have a given app role?
create or replace function public.current_user_has_role(target_role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.active = true
      and target_role = any(u.app_roles)
  );
$$;

create or replace function public.current_user_is_admin()
returns boolean language sql stable as $$
  select public.current_user_has_role('PASTOR') or public.current_user_has_role('WORSHIP_HEAD');
$$;

-- Enable RLS
alter table public.users enable row level security;
alter table public.instrument_roles enable row level security;
alter table public.user_instrument_roles enable row level security;
alter table public.service_types enable row level security;
alter table public.invites enable row level security;
alter table public.push_subscriptions enable row level security;

-- users
create policy users_select_authenticated on public.users
  for select to authenticated using (true);

create policy users_update_self on public.users
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy users_admin_all on public.users
  for all to authenticated using (public.current_user_is_admin()) with check (public.current_user_is_admin());

-- instrument_roles
create policy instrument_roles_select on public.instrument_roles
  for select to authenticated using (true);

create policy instrument_roles_admin on public.instrument_roles
  for all to authenticated using (public.current_user_is_admin()) with check (public.current_user_is_admin());

-- user_instrument_roles
create policy uir_select on public.user_instrument_roles
  for select to authenticated using (true);

create policy uir_admin on public.user_instrument_roles
  for all to authenticated using (public.current_user_is_admin()) with check (public.current_user_is_admin());

-- service_types
create policy service_types_select on public.service_types
  for select to authenticated using (true);

create policy service_types_admin on public.service_types
  for all to authenticated using (public.current_user_is_admin()) with check (public.current_user_is_admin());

-- invites: admins manage; an invite is also readable by anyone holding the token (handled via server action with service role)
create policy invites_admin on public.invites
  for all to authenticated using (public.current_user_is_admin()) with check (public.current_user_is_admin());

-- push_subscriptions: own rows only
create policy ps_select_own on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());

create policy ps_insert_own on public.push_subscriptions
  for insert to authenticated with check (user_id = auth.uid());

create policy ps_update_own on public.push_subscriptions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy ps_delete_own on public.push_subscriptions
  for delete to authenticated using (user_id = auth.uid());
