create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_user_count int;
  v_invite record;
  v_app_roles app_role[];
  v_instrument_ids uuid[];
begin
  select count(*) into v_user_count from public.users;

  -- Look for an unconsumed, unexpired invite matching the email
  select * into v_invite
  from public.invites
  where lower(email) = lower(new.email)
    and accepted_at is null
    and expires_at > now()
  order by invited_at desc
  limit 1;

  if v_user_count = 0 then
    v_app_roles := array['PASTOR', 'WORSHIP_HEAD']::app_role[];
    v_instrument_ids := '{}';
  elsif v_invite.id is not null then
    v_app_roles := v_invite.intended_app_roles;
    v_instrument_ids := v_invite.intended_instrument_role_ids;
  else
    v_app_roles := array['MEMBER']::app_role[];
    v_instrument_ids := '{}';
  end if;

  insert into public.users (id, email, name, app_roles)
  values (new.id, new.email, coalesce(v_invite.name, ''), v_app_roles);

  -- Wire up instrument roles if any
  if array_length(v_instrument_ids, 1) > 0 then
    insert into public.user_instrument_roles (user_id, instrument_role_id)
    select new.id, unnest(v_instrument_ids);
  end if;

  -- Mark invite accepted
  if v_invite.id is not null then
    update public.invites set accepted_at = now() where id = v_invite.id;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
