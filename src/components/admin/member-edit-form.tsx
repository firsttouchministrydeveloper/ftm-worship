"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { updateMember } from "@/actions/members";

const APP_ROLES = ["MEMBER", "WORSHIP_LEADER", "WORSHIP_HEAD", "PASTOR"] as const;

type Member = { id: string; name: string; email: string; app_roles: string[]; active: boolean };

export function MemberEditForm({
  member, instrumentRoles, initialSelected,
}: { member: Member; instrumentRoles: { id: string; name: string }[]; initialSelected: string[] }) {
  const [appRoles, setAppRoles] = useState<string[]>(member.app_roles);
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [active, setActive] = useState(member.active);
  const [msg, setMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle(list: string[], setter: (n: string[]) => void, v: string) {
    setter(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  }

  function save() {
    startTransition(async () => {
      const res = await updateMember({
        id: member.id,
        app_roles: appRoles,
        instrument_role_ids: selected,
        active,
      });
      setMsg(res.ok ? "Saved." : res.error);
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{member.email}</p>

      <fieldset>
        <legend className="text-sm font-medium">App roles</legend>
        <div className="space-y-1 mt-2">
          {APP_ROLES.map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm">
              <Checkbox checked={appRoles.includes(r)} onCheckedChange={() => toggle(appRoles, setAppRoles, r)} />
              {r}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium">Instrument roles</legend>
        <div className="space-y-1 mt-2 max-h-64 overflow-auto">
          {instrumentRoles.map((r) => (
            <label key={r.id} className="flex items-center gap-2 text-sm">
              <Checkbox checked={selected.includes(r.id)} onCheckedChange={() => toggle(selected, setSelected, r.id)} />
              {r.name}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={active} onCheckedChange={(v) => setActive(Boolean(v))} />
        Active
      </label>

      <Button onClick={save} disabled={isPending}>Save</Button>
      {msg && <p className="text-sm">{msg}</p>}
    </div>
  );
}
