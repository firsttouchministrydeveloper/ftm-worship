"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { createInvite } from "@/actions/invites";

const APP_ROLES = ["MEMBER", "WORSHIP_LEADER", "WORSHIP_HEAD", "PASTOR"] as const;

export function InviteDialog({ instrumentRoles }: { instrumentRoles: { id: string; name: string }[] }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [appRoles, setAppRoles] = useState<string[]>(["MEMBER"]);
  const [instr, setInstr] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle<T extends string>(list: T[], setter: (n: T[]) => void, value: T) {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const res = await createInvite({
        email, name,
        intended_app_roles: appRoles,
        intended_instrument_role_ids: instr,
      });
      setMsg(res.ok ? `Invite sent. Link: ${res.inviteUrl}` : res.error);
      if (res.ok) { setEmail(""); setName(""); setAppRoles(["MEMBER"]); setInstr([]); }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="name">Name (optional)</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
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
        <div className="space-y-1 mt-2 max-h-48 overflow-auto">
          {instrumentRoles.map((r) => (
            <label key={r.id} className="flex items-center gap-2 text-sm">
              <Checkbox checked={instr.includes(r.id)} onCheckedChange={() => toggle(instr, setInstr, r.id)} />
              {r.name}
            </label>
          ))}
        </div>
      </fieldset>
      <Button type="submit" disabled={isPending}>Send invite</Button>
      {msg && <p className="text-sm">{msg}</p>}
    </form>
  );
}
