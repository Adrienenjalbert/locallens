import { Routes, Route, Link } from "react-router-dom";
import { ThemeProvider } from "./theme/ThemeProvider";
import { gardeners } from "@config/verticals/gardeners";
import { LocationPage } from "./pages/LocationPage";

function Home() {
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
        to="/gardeners/manchester"
        className="mt-6 inline-block rounded-md bg-primary px-4 py-2.5 font-medium text-primary-foreground transition hover:opacity-90"
      >
        See best gardeners in Manchester
      </Link>
    </main>
  );
}

export function App() {
  return (
    <ThemeProvider tokens={gardeners.theme}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/:vertical/:location" element={<LocationPage />} />
      </Routes>
    </ThemeProvider>
  );
}
