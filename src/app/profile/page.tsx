import { requireUser } from "@/lib/auth/guards";
import { AppShell } from "@/components/layout/app-shell";
import { ProfileForm } from "@/components/profile/profile-form";

export default async function ProfilePage() {
  const user = await requireUser();
  return (
    <AppShell user={user}>
      <h1 className="text-2xl font-bold mb-6">Profile</h1>
      <ProfileForm initialName={user.name} initialAvatarUrl={user.avatar_url} />
    </AppShell>
  );
}
