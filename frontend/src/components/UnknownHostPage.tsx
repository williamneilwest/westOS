export function UnknownHostPage({ hostname }: { hostname: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 py-12 text-zinc-100">
      <div className="max-w-xl rounded-3xl border border-white/10 bg-zinc-900/70 p-8 shadow-2xl">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">westOS</p>
        <h1 className="mt-4 text-3xl font-semibold text-white">Unknown hostname</h1>
        <p className="mt-3 text-sm text-zinc-400">
          No frontend module is registered for <span className="text-zinc-200">{hostname}</span>.
        </p>
      </div>
    </main>
  );
}
