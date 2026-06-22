import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";

// This page is public — use the service-role client server-side, never expose to browser.
function service() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } }
  );
}

export default async function InviteAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = service();
  const { data } = await supabase
    .from("invites")
    .select("email, name, expires_at, accepted_at, intended_app_roles")
    .eq("token", token)
    .single();

  const isValid =
    data && !data.accepted_at && new Date(data.expires_at) > new Date();

  if (!isValid) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-2xl font-bold">Invite expired</h1>
          <p className="text-sm text-muted-foreground">
            This invite has expired or is invalid. Ask your Worship Head to send
            a new one.
          </p>
        </div>
      </main>
    );
  }

  const signinUrl = `/signin?email=${encodeURIComponent(data.email)}`;

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-bold">You&apos;re invited!</h1>
        <p>
          Hi{data.name ? ` ${data.name}` : ""}, you&apos;ve been invited to the
          worship team app as{" "}
          <strong>{data.intended_app_roles.join(", ")}</strong>.
        </p>
        <p className="text-sm text-muted-foreground">
          Sign in with <strong>{data.email}</strong> to accept.
        </p>
        <Button
          className="w-full"
          render={<Link href={signinUrl}>Continue to sign in</Link>}
        />
      </div>
    </main>
  );
}
