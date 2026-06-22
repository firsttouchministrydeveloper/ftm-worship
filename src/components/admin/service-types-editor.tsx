"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createServiceType, updateServiceType } from "@/actions/service-types";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type ServiceType = {
  id: string;
  name: string;
  recurring_day: number;
  recurring_time: string | null;
  notes: string | null;
  active: boolean;
};

export function ServiceTypesEditor({ initial }: { initial: ServiceType[] }) {
  const [rows, setRows] = useState(initial);
  const [draft, setDraft] = useState({ name: "", recurring_day: 0, recurring_time: "", notes: "" });
  const [isPending, startTransition] = useTransition();

  function add() {
    startTransition(async () => {
      const res = await createServiceType({
        name: draft.name,
        recurring_day: draft.recurring_day,
        recurring_time: draft.recurring_time || null,
        notes: draft.notes || null,
      });
      if (res.ok) {
        setDraft({ name: "", recurring_day: 0, recurring_time: "", notes: "" });
        window.location.reload();
      } else alert(res.error);
    });
  }

  function patch(id: string, change: Partial<ServiceType>) {
    startTransition(async () => {
      const res = await updateServiceType({ id, ...change });
      if (res.ok) setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...change } : r)));
      else alert(res.error);
    });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end p-3 border rounded">
        <div>
          <label className="text-xs">Name</label>
          <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </div>
        <div>
          <label className="text-xs">Day</label>
          <Select value={String(draft.recurring_day)} onValueChange={(v) => setDraft({ ...draft, recurring_day: Number(v) })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs">Time (HH:MM, optional)</label>
          <Input type="time" value={draft.recurring_time} onChange={(e) => setDraft({ ...draft, recurring_time: e.target.value })} />
        </div>
        <Button onClick={add} disabled={!draft.name || isPending}>Add</Button>
      </div>

      <ul className="divide-y border rounded">
        {rows.map((r) => (
          <li key={r.id} className="p-3 grid grid-cols-1 md:grid-cols-5 items-center gap-2">
            <Input value={r.name} onChange={(e) => setRows((rs) => rs.map((x) => x.id === r.id ? { ...x, name: e.target.value } : x))} onBlur={() => patch(r.id, { name: r.name })} />
            <span className="text-sm">{DAYS[r.recurring_day]}</span>
            <span className="text-sm">{r.recurring_time ?? "—"}</span>
            <Input value={r.notes ?? ""} placeholder="Notes" onChange={(e) => setRows((rs) => rs.map((x) => x.id === r.id ? { ...x, notes: e.target.value } : x))} onBlur={() => patch(r.id, { notes: r.notes ?? null })} />
            <Button variant={r.active ? "outline" : "default"} onClick={() => patch(r.id, { active: !r.active })}>{r.active ? "Deactivate" : "Activate"}</Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
