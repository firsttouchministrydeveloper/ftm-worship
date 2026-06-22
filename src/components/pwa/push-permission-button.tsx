"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { subscribeToPush } from "@/lib/push/register";

export function PushPermissionButton() {
  const [msg, setMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function enable() {
    startTransition(async () => {
      const res = await subscribeToPush();
      setMsg(res.ok ? "Push enabled on this device." : res.error);
    });
  }

  return (
    <div className="space-y-2">
      <Button onClick={enable} disabled={isPending}>Enable push on this device</Button>
      {msg && <p className="text-sm">{msg}</p>}
    </div>
  );
}
