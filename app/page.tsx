import Link from "next/link";
import {
  ArrowRight,
  Database,
  Shield,
  PlusCircle,
  Fingerprint,
  CheckCircle2,
  BadgeCheck,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";

/**
 * ChainRight Landing Page v2 — Black & Amber Edition.
 * Adaptado del output real de Stitch (chainright v2).
 * Screen: ChainRight - Dynamic Split Exploration
 */
export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* ─── Radical Asymmetric Hero ─── */}
      <section className="relative min-h-screen flex flex-col md:flex-row overflow-hidden">
        {/* Left Panel: High Energy Content */}
        <div className="w-full md:w-7/12 flex flex-col justify-center px-8 md:px-16 py-32 z-10">
          <div className="mb-8">
            <span className="bg-[#3c3329] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#ffc174]">
              WEB3 PROTOCOL
            </span>
          </div>
          <h1 className="font-[family-name:var(--font-newsreader)] text-[64px] md:text-[92px] leading-none mb-8 max-w-2xl">
            Impenetrable{" "}
            <span className="italic text-[#ffc174]">Provenance.</span>
          </h1>
          <p className="text-lg text-[#d8c3ad] max-w-xl mb-12 leading-relaxed">
            The Future of AI Art requires more than just watermarks. ChainRight
            leverages cryptographic DNA to anchor creative authorship into the
            eternal ledger.
          </p>
          <div className="flex flex-wrap gap-6">
            <Link
              href="/create"
              className="bg-[#f59e0b] text-[#2a1700] px-10 py-5 text-sm font-medium tracking-wide hover:bg-[#ffb95f] transition-all flex items-center gap-4"
            >
              Secure Your Portfolio
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/my-works"
              className="bg-transparent text-[#f0e0d1] px-10 py-5 text-sm font-medium tracking-wide hover:bg-[#31281f] transition-all flex items-center gap-4 border border-white/5"
            >
              View Ecosystem
              <Database className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* Right Panel: Abstract Visual */}
        <div className="w-full md:w-5/12 relative h-[500px] md:h-auto overflow-hidden">
          <img
            className="absolute inset-0 w-full h-full object-cover grayscale brightness-75 hover:grayscale-0 transition-all duration-1000"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAAR_9tRsUpvsytqVh-GZwAIRlzK6dBcAK9ATbZca_puamykbHUjSWviKzu3iyoXfkVPtkkM-CmYBT1aFq6QrjJpPsKRJmUNGN-3Nc6hY8KiF0SQ4sZS5FR3L99avX0rk02E7w89bpduenM9ZkhsL8eC0bJ911n4bPKTKgerj1EZW6nXdpKDjUP_mS9QrpXXlLaXYpLPvL_w7972yqof21XdATYXp5BhX4ewbjwCKV0ELZnKIlll_jAf8ZdKj9QIZ4yEL-E2pdscQ"
            alt="Abstract digital sculpture of interlocking golden filaments and matte black geometric shards"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#19120a] via-transparent to-transparent" />
        </div>
      </section>

      {/* ─── Dynamic Masonry Feature Grid ─── */}
      <section className="max-w-7xl mx-auto px-8 md:px-16 py-32">
        <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="max-w-2xl">
            <h2 className="font-[family-name:var(--font-newsreader)] text-5xl mb-4">
              Radical Integrity.
            </h2>
            <p className="text-lg text-[#d8c3ad] italic">
              Decentralized protocols meeting high-end artistic preservation.
            </p>
          </div>
          <div className="h-[1px] flex-grow bg-[#534434]/30 mb-4 hidden md:block" />
          <div className="text-xs font-semibold uppercase tracking-[0.1em] text-[#ffc174] pb-2">
            PROCESS_V.02
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Large Card */}
          <div className="md:col-span-8 bg-[#141414] p-12 flex flex-col justify-between min-h-[400px] group transition-all duration-500 hover:bg-[#31281f]">
            <div>
              <Shield className="w-12 h-12 text-[#ffc174] mb-8" strokeWidth={1.5} />
              <h3 className="font-[family-name:var(--font-newsreader)] text-3xl mb-4">
                Cryptographic Anchoring
              </h3>
              <p className="text-[#d8c3ad] max-w-md leading-relaxed">
                Every generation is timestamped and hash-linked to the creator&apos;s
                wallet, creating a permanent lineage that survives re-sampling
                and compression.
              </p>
            </div>
            <div className="mt-8 pt-8 border-t border-[#534434]/20 flex justify-between items-center">
              <span className="text-xs font-semibold uppercase tracking-widest text-[#ffc174]">
                MODULE 01
              </span>
              <PlusCircle className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity text-[#ffc174]" />
            </div>
          </div>

          {/* Tall Card */}
          <div className="md:col-span-4 bg-[#141414] overflow-hidden group">
            <div className="h-64 relative">
              <img
                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuA0c5G1jHUKdTuw8XaTwNB8LNQg4HkB5Rh0NOXOunJ1TToZ1HZ9dHXUWxH8_GMxhTNjaog77WYGTnC2qXC63vnfsDoHjiwZ_JzZYv9CUnMWPmF5iCUq6VnXOJxu39ZXCBfcaxaqyVHO1r5vVnsNPv9S3EJbcOvVedOSUo_GTTjFtbWXMR2b8nQDyEpip-_1EwoeFGdS5KWiVO2Rj0s7XkahLT9XggTM-GRPCwok02zZusakUyaEexPqUp7rr9Xchcgug5g2m28Vew"
                alt="Abstract liquid gold patterns on matte charcoal surface"
              />
            </div>
            <div className="p-8">
              <h3 className="font-[family-name:var(--font-newsreader)] text-2xl mb-2">
                Neural Signatures
              </h3>
              <p className="text-[#d8c3ad] leading-relaxed">
                Embedding invisible provenance directly into the model&apos;s latent
                space representation.
              </p>
            </div>
          </div>

          {/* Square Card */}
          <div className="md:col-span-4 bg-[#141414] p-8 flex flex-col justify-center items-center text-center gap-6 group hover:bg-[#221a12] transition-colors">
            <div className="w-20 h-20 bg-[#3c3329] flex items-center justify-center text-[#ffc174]">
              <Fingerprint className="w-10 h-10" strokeWidth={1.5} />
            </div>
            <h3 className="font-[family-name:var(--font-newsreader)] text-2xl">
              Unique DNA
            </h3>
            <p className="text-[#d8c3ad] leading-relaxed">
              No two artifacts share the same provenance hash.
            </p>
          </div>

          {/* Wide Card */}
          <div className="md:col-span-8 bg-[#141414] p-12 flex flex-col md:flex-row gap-12 group hover:bg-[#31281f] transition-all">
            <div className="flex-1">
              <h3 className="font-[family-name:var(--font-newsreader)] text-3xl mb-4 italic">
                The Future of AI Art
              </h3>
              <p className="text-[#d8c3ad] mb-6 leading-relaxed">
                As generative tools proliferate, the value shifts from the image
                to the proof of intent. ChainRight provides the infrastructure
                for verified creative legacies.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-4 text-[#ffc174]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-[#f0e0d1]">
                    Immutable Metadata
                  </span>
                </li>
                <li className="flex items-center gap-4 text-[#ffc174]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-[#f0e0d1]">
                    Legal-Grade Attestation
                  </span>
                </li>
              </ul>
            </div>
            <div className="flex-1 bg-[#140d06] h-64 md:h-auto overflow-hidden border border-[#534434]/10">
              <img
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCeUcfGIERCKBftXpBPfSvY3w9WkfRi5-nP5qQFsIqlxJCwEQsaJTb0vtb8OGu8NomzRShm9xEteKvInzuwD6PP7fm35YlZWTsNhU0M_UjZa_EujMha1oXVzA6GThamcMwWiA-nQo7fpS81Nc5L6rBnoY92YTV-bTyHt-tw2aAKnIKBf6W5o5oHfAUvJmRfFXbKiDO2fXHzmgyCyysSqndYwd3sFXfOYarBeAtGVQe39T6yxm0BXe546xXSAwR69E-TjegRuQMszQ"
                alt="Minimalist architectural detail with sharp angular shadows and amber light"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── High Energy CTA Section ─── */}
      <section className="py-32">
        <div className="max-w-7xl mx-auto px-8 md:px-16">
          <div className="bg-[#141414] p-12 md:p-20 flex flex-col items-center text-center group transition-all duration-500 hover:bg-[#31281f] relative overflow-hidden">
            {/* Background Accent Decor */}
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
              <BadgeCheck className="w-60 h-60 text-[#f0e0d1]" strokeWidth={1} />
            </div>
            <div className="relative z-10">
              <ShieldCheck
                className="w-16 h-16 text-[#ffc174] mb-8 mx-auto"
                strokeWidth={1.5}
              />
              <h2 className="font-[family-name:var(--font-newsreader)] text-5xl md:text-6xl mb-6">
                Secure the{" "}
                <span className="italic text-[#ffc174]">Inevitable.</span>
              </h2>
              <p className="text-lg text-[#d8c3ad] max-w-2xl mx-auto mb-12 leading-relaxed">
                Join the vanguard of creators who are defining the standards of
                the next creative era. Start anchoring your work today into the
                eternal ledger.
              </p>
              <div className="flex justify-center">
                <Link
                  href="/create"
                  className="group/link flex items-center gap-6"
                >
                  <span className="text-xs font-semibold uppercase tracking-widest text-[#f0e0d1] group-hover/link:text-[#ffc174] transition-colors">
                    LAUNCH INTERFACE
                  </span>
                  <div className="w-16 h-16 border border-[#ffc174] flex items-center justify-center group-hover/link:bg-[#ffc174] transition-all">
                    <ArrowUpRight className="w-6 h-6 text-[#ffc174] group-hover/link:text-[#2a1700] transition-colors" />
                  </div>
                </Link>
              </div>
            </div>
            <div className="mt-12 pt-8 border-t border-[#534434]/20 w-full flex justify-between items-center">
              <span className="text-xs font-semibold uppercase tracking-widest text-[#ffc174]">
                PROTOCOL_V.02
              </span>
              <div className="flex gap-2">
                <div className="w-1 h-1 bg-[#ffc174]" />
                <div className="w-1 h-1 bg-[#534434]" />
                <div className="w-1 h-1 bg-[#534434]" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
