export default function StatCard({ label, value, helper, icon: Icon }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950 p-5 text-white shadow-[0_20px_60px_rgba(15,23,42,0.35)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200/80">
            {label}
          </p>
          <p className="mt-3 text-3xl font-semibold">{value}</p>
          {helper ? <p className="mt-2 text-sm text-slate-300">{helper}</p> : null}
        </div>
        {Icon ? (
          <div className="rounded-2xl bg-white/10 p-3">
            <Icon className="h-5 w-5 text-cyan-200" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

