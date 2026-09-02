import { createFileRoute } from "@tanstack/react-router";

import { EnsNameSearch } from "../components/ens-name-search";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <main className="hero-field relative isolate flex min-h-[calc(100vh-4rem)] px-4">
      <section className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center pt-[clamp(4rem,10vh,6rem)] text-center">
        <p className="text-accent mb-5 text-xs font-bold tracking-[0.2em] uppercase">
          ENS record verification
        </p>
        <h1 className="text-[clamp(3.25rem,8vw,6.75rem)] leading-none font-semibold tracking-[-0.065em]">
          Trust the record.
          <span className="font-display text-midnight mt-2 block font-normal italic">
            Verify the source.
          </span>
        </h1>
        <p className="text-muted mt-5 max-w-xl text-base leading-7 sm:text-lg">
          Search an ENS name to inspect its records and verify where they came
          from.
        </p>

        <div className="mt-8 w-full max-w-2xl">
          <EnsNameSearch />
        </div>
      </section>
    </main>
  );
}
