export default function Loading() {
  return (
    <>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div className="space-y-3">
          <div className="skeleton h-10 w-64" />
          <div className="skeleton h-4 w-96" />
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4 2xl:grid-cols-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-line bg-panel p-5">
            <div className="skeleton h-3 w-20" />
            <div className="skeleton mt-3 h-10 w-24" />
            <div className="skeleton mt-2 h-3 w-32" />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-line bg-panel p-6">
        <div className="skeleton h-4 w-40" />
        <div className="skeleton mt-6 h-64 w-full" />
      </div>

      <style>{`
        .skeleton {
          background: linear-gradient(90deg, var(--color-line) 0%, var(--color-panel2) 50%, var(--color-line) 100%);
          background-size: 200% 100%;
          border-radius: 0.5rem;
          animation: deck-skeleton 1.4s var(--ease-standard) infinite;
        }
        @keyframes deck-skeleton {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .skeleton { animation: none; }
        }
      `}</style>
    </>
  );
}
