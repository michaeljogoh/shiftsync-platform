import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
      <div className="space-y-4 text-center">
        <h1 className="text-3xl font-semibold">ShiftSync Web</h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          Frontend for the ShiftSync scheduling platform. Use the links below to navigate to the
          login screen or the (placeholder) dashboard shell.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/login"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Go to login
          </Link>
          <Link
            href="/(dashboard)"
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground"
          >
            Open dashboard shell
          </Link>
        </div>
      </div>
    </main>
  );
}

