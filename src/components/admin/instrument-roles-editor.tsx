"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { createInstrumentRole, updateInstrumentRole } from "@/actions/instrument-roles";

type Role = { id: string; name: string; display_order: number; active: boolean };

export function InstrumentRolesEditor({ initial }: { initial: Role[] }) {
  const [rows, setRows] = useState<Role[]>(initial);
  const [newName, setNewName] = useState("");
  const [isPending, startTransition] = useTransition();

  function add() {
    startTransition(async () => {
      const res = await createInstrumentRole({ name: newName, display_order: rows.length * 10 });
      if (res.ok) {
        setNewName("");
        // Page revalidates server-side; rely on next refresh
        window.location.reload();
      } else {
        alert(res.error);
      }
    });
  }

  function patch(id: string, change: Partial<Role>) {
    startTransition(async () => {
      const res = await updateInstrumentRole({ id, ...change });
      if (res.ok) {
        setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...change } : r)));
      } else {
        alert(res.error);
      }
    });
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex gap-2">
        <Input
          placeholder="New role name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <Button onClick={add} disabled={!newName || isPending}>Add</Button>
      </div>
      <ul className="divide-y border rounded">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-3 p-3">
            <Input
              className="flex-1"
              value={r.name}
              onChange={(e) => setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, name: e.target.value } : x)))}
              onBlur={() => patch(r.id, { name: r.name })}
            />
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={r.active} onCheckedChange={(v) => patch(r.id, { active: Boolean(v) })} />
              Active
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
