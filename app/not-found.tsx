import Link from "next/link";

/**
 * Página 404.
 */
export default function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
      <p className="text-6xl mb-4">🔍</p>
      <h1 className="text-4xl font-bold mb-4">Page Not Found</h1>
      <p className="text-slate-400 mb-8">Go back to the homepage to continue with ChainRight.</p>
      <Link
        href="/"
        className="px-6 py-3 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-500 transition-colors"
      >
        Go Home
      </Link>
    </div>
  );
}
