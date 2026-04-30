import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ChainRight - Procedencia verificable para IA",
  description: "Demostrá que sos el creador original de tus imágenes generadas por IA",
};

/**
 * Root Layout de ChainRight.
 * Server Component por defecto en Next.js 15.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-50 min-h-screen`}>
        {/* Navbar simple */}
        <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 font-bold text-lg">
              <span className="text-2xl">🔗</span>
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                ChainRight
              </span>
            </a>
            <div className="flex items-center gap-6 text-sm">
              <a 
                href="/create" 
                className="text-slate-400 hover:text-cyan-400 transition-colors"
              >
                Crear Obra
              </a>
              <a 
                href="/verify" 
                className="text-slate-400 hover:text-cyan-400 transition-colors"
              >
                Verificar
              </a>
              <a
                href="https://github.com/0gfoundation"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:border-cyan-500 hover:text-cyan-400 transition-all text-xs"
              >
                Powered by 0G
              </a>
            </div>
          </div>
        </nav>

        {/* Contenido */}
        <main className="max-w-6xl mx-auto px-4 py-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-800 mt-20">
          <div className="max-w-6xl mx-auto px-4 py-8 text-center text-slate-500 text-sm">
            <p>
              ChainRight — Procedencia verificable para imágenes generadas con IA
            </p>
            <p className="mt-2 text-xs">
              Construido en 0G Chain | Demo para Hackathon
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
