"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const supabase = createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL is not set");
  const redirectTo = `${appUrl}/auth/callback`;

  async function signInWithOAuth(provider: "google" | "apple") {
    await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
  }

  async function signInWithMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    setStatus(error ? "error" : "sent");
  }

  return (
    <div className="space-y-4 max-w-sm mx-auto">
      <Button className="w-full" onClick={() => signInWithOAuth("google")}>Sign in with Google</Button>
      <Button className="w-full" onClick={() => signInWithOAuth("apple")}>Sign in with Apple</Button>

      <div className="text-center text-sm text-muted-foreground">or</div>

      <form onSubmit={signInWithMagicLink} className="space-y-3">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" className="w-full" disabled={status === "sending"}>
          {status === "sent" ? "Check your email" : "Send magic link"}
        </Button>
        {status === "error" && <p className="text-sm text-red-600">Couldn&apos;t send link. Try again.</p>}
      </form>
    </div>
  );
}
