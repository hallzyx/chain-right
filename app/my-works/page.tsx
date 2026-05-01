import { MyWorks } from "@/components/my-works";

/**
 * Página de obras de la wallet conectada.
 */
export default function MyWorksPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-100">Mis Obras</h1>
        <p className="mt-2 text-slate-400">
          Historial tangible de tus obras registradas en este MVP.
        </p>
      </div>

      <MyWorks />
    </div>
  );
}
