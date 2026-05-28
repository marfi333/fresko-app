import { SignUpForm } from "./_components/sign-up-form";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-muted-foreground text-sm">
            Sign up to start managing your household inventory
          </p>
        </div>
        <SignUpForm />
      </div>
    </div>
  );
}
