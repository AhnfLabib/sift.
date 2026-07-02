import { signIn } from "./actions";

const SIGN_IN_ERROR_MESSAGE = "Couldn't sign you in. Check your email and password.";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="glass w-full max-w-sm p-8">
        <p className="font-display text-3xl text-center mb-8">sift.</p>
        <form action={signIn} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="rounded-lg border border-[rgba(35,39,31,0.22)] bg-page px-3 py-2 text-ink"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="rounded-lg border border-[rgba(35,39,31,0.22)] bg-page px-3 py-2 text-ink"
            />
          </div>
          {error ? (
            <p className="text-sm text-debit">{SIGN_IN_ERROR_MESSAGE}</p>
          ) : null}
          <button
            type="submit"
            className="pressable rounded-lg bg-banker py-2 font-medium text-page"
          >
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
