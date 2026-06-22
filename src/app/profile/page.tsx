import { requireUser } from "@/lib/auth/guards";
import { AppShell } from "@/components/layout/app-shell";
import { ProfileForm } from "@/components/profile/profile-form";
import { PushPermissionButton } from "@/components/pwa/push-permission-button";

export default async function ProfilePage() {
  const user = await requireUser();
  return (
    <AppShell user={user}>
      <h1 className="text-2xl font-bold mb-6">Profile</h1>
      <div className="space-y-8">
        <ProfileForm initialName={user.name} initialAvatarUrl={user.avatar_url} />
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Notifications</h2>
          <PushPermissionButton />
        </section>
      </div>
    </AppShell>
  );
}
