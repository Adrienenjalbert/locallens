import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="font-display text-4xl font-semibold text-foreground">
        LocalLens
      </h1>
      <p className="mx-auto mt-3 max-w-prose text-muted-foreground">
        The directory that actually helps you choose — real data, ranked
        honestly, with tools that answer your real question.
      </p>
      <Link
        href="/gardeners/manchester"
        className="mt-6 inline-block rounded-md bg-primary px-4 py-2.5 font-medium text-primary-foreground transition hover:opacity-90"
      >
        See best gardeners in Manchester
      </Link>
    </main>
  );
}
