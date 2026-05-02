"use client";

import dynamic from "next/dynamic";

const AppProvidersNoSSR = dynamic<{ children: React.ReactNode }>(
  () => import("@/components/providers").then((m) => m.AppProviders),
  { ssr: false }
);

const WalletGateNoSSR = dynamic<{ children: React.ReactNode }>(
  () => import("@/components/wallet-gate").then((m) => m.WalletGate),
  { ssr: false }
);

const WalletBadgeNoSSR = dynamic(
  () => import("@/components/wallet-gate").then((m) => m.WalletBadge),
  { ssr: false }
);

const SessionSyncNoSSR = dynamic(
  () => import("@/components/session-sync").then((m) => m.SessionSync),
  { ssr: false }
);

/**
 * Root cliente con providers y wallet-gate.
 */
export function ClientRoot({ children }: { children: React.ReactNode }) {
  return (
    <AppProvidersNoSSR>
      <SessionSyncNoSSR />

      <nav className="border-b border-indigo-500/20 bg-[#070B1A]/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="text-2xl">🔗</span>
            <span className="bg-gradient-to-r from-indigo-300 via-violet-400 to-indigo-500 bg-clip-text text-transparent">
              ChainRight
            </span>
          </a>
          <div className="flex items-center gap-6 text-sm">
            <a href="/create" className="text-slate-400 hover:text-violet-300 transition-colors">Create</a>
            <a href="/verify" className="text-slate-400 hover:text-violet-300 transition-colors">Verify</a>
            <a href="/my-works" className="text-slate-400 hover:text-violet-300 transition-colors">My Works</a>
            <a
              href="https://github.com/0gfoundation"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg border border-indigo-500/30 text-slate-300 hover:border-violet-400 hover:text-violet-200 transition-all text-xs"
            >
              Powered by 0G
            </a>
            <WalletBadgeNoSSR />
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <WalletGateNoSSR>{children}</WalletGateNoSSR>
      </main>

      <footer className="border-t border-indigo-500/20 mt-20">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center text-slate-500 text-sm">
          <p>ChainRight — Verifiable provenance for AI-generated images</p>
          <p className="mt-2 text-xs">Built on 0G Chain | Hackathon Demo</p>
        </div>
      </footer>
    </AppProvidersNoSSR>
  );
}
