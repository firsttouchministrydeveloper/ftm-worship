"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    function handler(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferred || dismissed) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 md:bottom-6 md:right-6 md:left-auto md:max-w-sm rounded-lg border bg-background shadow-lg p-4 flex items-center gap-3">
      <p className="text-sm flex-1">Install FTM Worship for push notifications and a native-feel experience.</p>
      <Button onClick={async () => { await deferred.prompt(); setDeferred(null); }}>Install</Button>
      <Button variant="ghost" onClick={() => setDismissed(true)}>Later</Button>
    </div>
  );
}
