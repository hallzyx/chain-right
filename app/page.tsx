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
          <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
            Procedencia verificable
          </span>
          <br />
          para imágenes de IA
        </h1>

        <p className="text-xl text-slate-400 mb-10 leading-relaxed">
          Generaste una imagen con IA? Ahora podés demostrar que sos el creador original.
          ChainRight le da un registro on-chain, inmutable e irrefutable a cada obra.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/create"
            className={cn(
              "px-8 py-4 rounded-xl font-semibold text-lg transition-all",
              "bg-gradient-to-r from-cyan-500 to-blue-600",
              "hover:from-cyan-400 hover:to-blue-500",
              "shadow-lg shadow-cyan-500/25",
              "hover:shadow-cyan-500/40",
              "transform hover:-translate-y-0.5"
            )}
          >
            🎨 Crear Obra
          </Link>
          <Link
            href="/verify"
            className={cn(
              "px-8 py-4 rounded-xl font-semibold text-lg transition-all",
              "border-2 border-slate-700 text-slate-300",
              "hover:border-cyan-500 hover:text-cyan-400",
              "transform hover:-translate-y-0.5"
            )}
          >
            🔍 Verificar Autenticidad
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="mt-24 grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        <FeatureCard
          icon="⛓️"
          title="On-Chain Registry"
          description="Cada obra queda registrada en 0G Chain. Inmutable. Irrefutable. Nadie puede borrar ni modificar el registro."
        />
        <FeatureCard
          icon="🔑"
          title="Merkle Proof"
          description="Si modificás UN SOLO PÍXEL de la imagen, el Merkle Root cambia completamente. No se puede falsificar."
        />
        <FeatureCard
          icon="✅"
          title="TEE-Verified"
          description="La inferencia se ejecuta en Trusted Execution Environment. Podés demostrar que la imagen REALMENTE viene de ese prompt."
        />
      </div>

      {/* How it works */}
      <div className="mt-24 max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">
          Cómo funciona
        </h2>
        <div className="space-y-8">
          <StepCard
            number={1}
            title="Generás"
            description="Escribís tu prompt y generás la imagen via 0G Compute (Flux Turbo, TEE-verified). Cada inferencia tiene un ZG-Res-Key único."
          />
          <StepCard
            number={2}
            title="Almacenás"
            description="Subís la imagen a 0G Storage. Se genera un Merkle Root — el hash único de tu obra. Si cambia un píxel, cambia el hash."
          />
          <StepCard
            number={3}
            title="Registrás"
            description="Minteás un NFT en 0G Chain que guarda: Merkle Root + ZG-Res-Key + Prompt + Timestamp + Tu wallet. Todo on-chain."
          />
          <StepCard
            number={4}
            title="Verificás"
            description="Cualquier persona, en cualquier momento, puede subir la imagen y verificar. El sistema calcula el hash y busca on-chain."
          />
        </div>
      </div>

      {/* Wow moment teaser */}
      <div className="mt-24 text-center max-w-2xl mx-auto">
        <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-2xl p-8">
          <p className="text-4xl mb-4">🤯</p>
          <h3 className="text-xl font-bold mb-3">El Wow Moment</h3>
          <p className="text-slate-400">
            Modificamos <strong>UN SOLO PÍXEL</strong> de tu imagen. El Merkle Root cambia completamente.
            La verificación falla. Esto es lo que hace imposible falsificar una obra registrada en ChainRight.
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
