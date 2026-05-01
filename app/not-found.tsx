/**
 * Página 404 explícita para App Router.
 */
export default function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center rounded-2xl border border-indigo-500/20 bg-[#111A38]/70 p-8">
        <p className="text-4xl mb-2">404</p>
        <h1 className="text-2xl font-bold text-slate-100">Página no encontrada</h1>
        <p className="text-sm text-slate-400 mt-2">Volvé al inicio para continuar con el flujo de ChainRight.</p>
        <a
          href="/"
          className="inline-block mt-5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
        >
          Ir al inicio
        </a>
      </div>
    </div>
  );
}
