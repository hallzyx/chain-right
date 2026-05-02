import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Página de inicio de ChainRight.
 * Server Component.
 */
export default function HomePage() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center">
      {/* Hero */}
      <div className="text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm mb-8">
          <span className="animate-pulse">●</span>
          Powered by 0G Network
        </div>

        <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
          <span className="bg-gradient-to-r from-indigo-300 via-violet-400 to-indigo-500 bg-clip-text text-transparent">
            Verifiable Provenance
          </span>
          <br />
          for AI Images
        </h1>

        <p className="text-xl text-slate-400 mb-10 leading-relaxed">
          You generated an AI image? Now you can prove you are the original creator.
          ChainRight gives every artwork an on-chain, immutable, and irrefutable record.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/create"
            className={cn(
              "px-8 py-4 rounded-xl font-semibold text-lg transition-all",
              "bg-gradient-to-r from-violet-600 to-indigo-600",
              "hover:from-violet-500 hover:to-indigo-500",
              "shadow-lg shadow-violet-700/25",
              "hover:shadow-violet-700/40",
              "transform hover:-translate-y-0.5"
            )}
          >
            🎨 Create Artwork
          </Link>
          <Link
            href="/verify"
            className={cn(
              "px-8 py-4 rounded-xl font-semibold text-lg transition-all",
              "border-2 border-slate-700 text-slate-300",
              "hover:border-violet-400 hover:text-violet-300",
              "transform hover:-translate-y-0.5"
            )}
          >
            🔍 Verify Authenticity
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="mt-24 grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        <FeatureCard
          icon="⛓️"
          title="On-Chain Registry"
          description="Every artwork is recorded on 0G Chain. Immutable. Irrefutable. No one can delete or modify the record."
        />
        <FeatureCard
          icon="🔑"
          title="Merkle Proof"
          description="If you change A SINGLE PIXEL of the image, the Merkle Root changes completely. Forgery is impossible."
        />
        <FeatureCard
          icon="✅"
          title="TEE-Verified"
          description="Inference runs in a Trusted Execution Environment. You can prove the image ACTUALLY came from that prompt."
        />
      </div>

      {/* How it works */}
      <div className="mt-24 max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">
          How It Works
        </h2>
        <div className="space-y-8">
          <StepCard
            number={1}
            title="Generate"
            description="Write your prompt and generate the image via 0G Compute (Flux Turbo, TEE-verified). Every inference has a unique ZG-Res-Key."
          />
          <StepCard
            number={2}
            title="Store"
            description="Upload the image to 0G Storage. A Merkle Root is generated — the unique hash of your artwork. Change one pixel, change the hash."
          />
          <StepCard
            number={3}
            title="Register"
            description="Mint an NFT on 0G Chain storing: Merkle Root + ZG-Res-Key + Prompt + Timestamp + Your wallet. All on-chain."
          />
          <StepCard
            number={4}
            title="Verify"
            description="Anyone, anytime, can upload the image and verify. The system computes the hash and looks it up on-chain."
          />
        </div>
      </div>

      {/* Wow moment teaser */}
      <div className="mt-24 text-center max-w-2xl mx-auto">
        <div className="bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border border-violet-500/20 rounded-2xl p-8">
          <p className="text-4xl mb-4">🤯</p>
          <h3 className="text-xl font-bold mb-3">The Wow Moment</h3>
          <p className="text-slate-400">
            We change <strong>A SINGLE PIXEL</strong> of your image. The Merkle Root changes completely.
            The verification fails. This is what makes it impossible to forge a work registered on ChainRight.
          </p>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-colors">
      <div className="text-3xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function StepCard({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-6 items-start">
      <div className={cn(
        "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg",
        "bg-gradient-to-br from-cyan-500 to-blue-600",
        "shadow-lg shadow-cyan-500/25"
      )}>
        {number}
      </div>
      <div className="pt-2">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-slate-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
