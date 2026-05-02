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
 * Root cliente con providers y wallet-gate — Black & Amber Edition.
 */
export function ClientRoot({ children }: { children: React.ReactNode }) {
  return (
    <AppProvidersNoSSR>
      <SessionSyncNoSSR />

      {/* ─── Top Navigation ─── */}
      <nav className="fixed top-0 w-full z-50 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-8 py-6 flex justify-between items-center">
          <a
            href="/"
            className="text-2xl font-bold tracking-tight text-[#f59e0b] font-[family-name:var(--font-newsreader)]"
          >
            ChainRight
          </a>
          <div className="hidden md:flex items-center gap-10">
            <a
              href="/create"
              className="text-neutral-400 font-medium hover:text-neutral-100 transition-colors"
            >
              Create
            </a>
            <a
              href="/verify"
              className="text-neutral-400 font-medium hover:text-neutral-100 transition-colors"
            >
              Verify
            </a>
            <a
              href="/my-works"
              className="text-neutral-400 font-medium hover:text-neutral-100 transition-colors"
            >
              My Works
            </a>
          </div>
          <div className="flex items-center gap-4">
            <WalletBadgeNoSSR />
          </div>
        </div>
      </nav>

      {/* ─── Main Content ─── */}
      <div className="pt-20">
        <WalletGateNoSSR>{children}</WalletGateNoSSR>
      </div>

      {/* ─── Footer ─── */}
      <footer className="w-full py-12 bg-[#0a0a0a] border-t border-white/5">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-[#f59e0b] font-bold text-xl font-[family-name:var(--font-newsreader)]">
            ChainRight
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            <a
              href="#"
              className="font-sans text-xs uppercase tracking-widest text-neutral-500 hover:text-[#f59e0b] transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="#"
              className="font-sans text-xs uppercase tracking-widest text-neutral-500 hover:text-[#f59e0b] transition-colors"
            >
              Terms of Service
            </a>
            <a
              href="#"
              className="font-sans text-xs uppercase tracking-widest text-neutral-500 hover:text-[#f59e0b] transition-colors"
            >
              Security
            </a>
            <a
              href="#"
              className="font-sans text-xs uppercase tracking-widest text-neutral-500 hover:text-[#f59e0b] transition-colors"
            >
              Contact
            </a>
          </div>
          <div className="font-sans text-xs uppercase tracking-widest text-neutral-500">
            &copy; 2024 ChainRight. All rights reserved.
          </div>
        </div>
      </footer>
    </AppProvidersNoSSR>
  );
}
