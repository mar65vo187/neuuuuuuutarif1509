export default function PortalLoading() {
  return <section role="status" aria-live="polite" aria-busy="true" className="space-y-6">
    <p className="text-sm font-medium text-slate-300">Arbeitsbereich wird geladen …</p>
    <div aria-hidden="true" className="space-y-6 motion-safe:animate-pulse">
      <div className="h-10 w-2/3 max-w-md rounded-xl bg-slate-700/40" />
      <div className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map((item) => <div key={item} className="h-24 rounded-2xl border border-slate-700/50 bg-slate-800/60" />)}</div>
      <div className="divide-y divide-slate-700/50 rounded-2xl border border-slate-700/50 bg-slate-800/40">{[0, 1, 2, 3].map((item) => <div key={item} className="flex items-center gap-4 p-5"><div className="h-10 w-10 rounded-xl bg-slate-700/40" /><div className="h-5 w-2/3 rounded-lg bg-slate-700/40" /></div>)}</div>
    </div>
  </section>;
}
