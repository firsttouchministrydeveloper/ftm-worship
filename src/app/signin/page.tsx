import { SignInForm } from "@/components/auth/signin-form";

export default function SignInPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-2xl font-bold text-center">Sign in</h1>
        <SignInForm />
      </div>
    </main>
  );
}
