"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/actions/profile";

export function ProfileForm({ initialName, initialAvatarUrl }: { initialName: string; initialAvatarUrl: string | null }) {
  const [name, setName] = useState(initialName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateProfile({ name, avatar_url: avatarUrl || null });
      setMessage(result.ok ? "Saved." : result.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-md">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="avatar">Avatar URL (optional)</Label>
        <Input id="avatar" type="url" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
      </div>
      <Button type="submit" disabled={isPending}>{isPending ? "Saving…" : "Save"}</Button>
      {message && <p className="text-sm">{message}</p>}
    </form>
  );
}
