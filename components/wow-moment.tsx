"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface WowMomentProps {
  originalRoot: string | null;
  modifiedRoot: string | null;
  originalImage: string | null;
}

/**
 * Experiencia visual "Wow Moment" que demuestra cómo modificar
 * UN SOLO PÍXEL cambia COMPLETAMENTE el hash criptográfico.
 *
 * Features:
 * - Split-screen con imagen original vs modificada (idénticas al ojo)
 * - Diff animado carácter por carácter de los dos hashes
 * - Contador de similitud con animación de caída
 * - Indicador visual del píxel modificado
 * - Scan line forense
 */
export function WowMoment({ originalRoot, modifiedRoot, originalImage }: WowMomentProps) {
  const [showDiff, setShowDiff] = useState(false);
  const [similarity, setSimilarity] = useState(100);
  const [scanPos, setScanPos] = useState(0);

  // Animación de scan line
  useEffect(() => {
    const interval = setInterval(() => {
      setScanPos((p) => (p + 2) % 100);
    }, 30);
    return () => clearInterval(interval);
  }, []);

  // Revelar diff y animar similitud después de un delay
  useEffect(() => {
    const t1 = setTimeout(() => setShowDiff(true), 600);
    const t2 = setTimeout(() => {
      // Animar contador de similitud hacia 0
      const animate = () => {
        setSimilarity((prev) => {
          const next = prev - (prev > 10 ? prev * 0.08 : 1);
          if (next <= 0.01) return 0;
          requestAnimationFrame(animate);
          return next;
        });
      };
      requestAnimationFrame(animate);
    }, 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Calcular diff real
  const diff = computeHashDiff(originalRoot || "", modifiedRoot || "");
  const matchingChars = diff.filter((d) => d.match).length;
  const totalChars = diff.length || 1;

  return (
    <div className="bg-gradient-to-br from-purple-950/60 via-slate-950 to-pink-950/60 border border-purple-500/30 rounded-2xl overflow-hidden shadow-2xl shadow-purple-500/10">
      {/* Header */}
      <div className="text-center px-6 pt-6 pb-2">
        <h3 className="text-xl font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent mb-1">
          🤯 Wow Moment: 1 Solo Píxel = Cambio Total
        </h3>
        <p className="text-sm text-slate-400">
          Modificamos <strong className="text-pink-300">1 byte</strong> del archivo.
          Las imágenes se ven <strong className="text-cyan-300">idénticas</strong> al ojo humano.
        </p>
      </div>

      {/* Split-screen con imágenes + scan line */}
      <div className="relative grid grid-cols-2 gap-px mx-6 mt-4 rounded-xl overflow-hidden border border-slate-700/50 bg-slate-900">
        {/* Scan line */}
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            background: `linear-gradient(to bottom, transparent ${scanPos - 0.5}%, rgba(139,92,246,0.15) ${scanPos}%, transparent ${scanPos + 0.5}%)`,
          }}
        />

        {/* Original */}
        <div className="relative bg-slate-950 p-3">
          <div className="absolute top-2 left-2 z-20 bg-green-500/20 border border-green-500/30 rounded-md px-2 py-0.5 text-[10px] font-bold text-green-400">
            ORIGINAL
          </div>
          {originalImage ? (
            <img src={originalImage} alt="Original" className="w-full h-48 object-contain opacity-80" />
          ) : (
            <div className="w-full h-48 flex items-center justify-center text-slate-600 text-xs">Sin imagen</div>
          )}
          {/* Píxel modificado indicator */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
            <div className="w-6 h-6 rounded-full border-2 border-green-400/60 animate-ping" />
          </div>
        </div>

        {/* Modificada */}
        <div className="relative bg-slate-950 p-3">
          <div className="absolute top-2 right-2 z-20 bg-red-500/20 border border-red-500/30 rounded-md px-2 py-0.5 text-[10px] font-bold text-red-400">
            MODIFICADA
          </div>
          {originalImage ? (
            <img src={originalImage} alt="Modificada" className="w-full h-48 object-contain opacity-80" />
          ) : (
            <div className="w-full h-48 flex items-center justify-center text-slate-600 text-xs">Sin imagen</div>
          )}
          {/* Píxel modificado indicator */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
            <div className="w-6 h-6 rounded-full border-2 border-pink-400/80 animate-ping" />
            <div className="absolute inset-0 w-3 h-3 rounded-full bg-pink-500/80 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Separador visual */}
      <div className="flex items-center gap-2 px-6 mt-4">
        <div className="flex-1 h-px bg-slate-700" />
        <span className="text-[10px] text-slate-500 font-mono">ANÁLISIS CRIPTOGRÁFICO</span>
        <div className="flex-1 h-px bg-slate-700" />
      </div>

      {/* Hash Diff animado */}
      <div className={cn("px-6 pt-3 pb-4 transition-all duration-500", showDiff ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}>
        <div className="grid grid-cols-2 gap-4 mb-3">
          {/* Hash original */}
          <div>
            <p className="text-[10px] text-green-400 font-bold mb-1.5">🟢 HASH ORIGINAL</p>
            <div className="bg-slate-950/80 border border-slate-700/50 rounded-lg p-3">
              <code className="text-[11px] leading-relaxed break-all font-mono">
                {originalRoot ? renderDiffRow(diff, "top") : "Calculando..."}
              </code>
            </div>
          </div>

          {/* Hash modificado */}
          <div>
            <p className="text-[10px] text-red-400 font-bold mb-1.5">🔴 HASH MODIFICADO</p>
            <div className="bg-slate-950/80 border border-slate-700/50 rounded-lg p-3">
              <code className="text-[11px] leading-relaxed break-all font-mono">
                {modifiedRoot ? renderDiffRow(diff, "bottom") : "Calculando..."}
              </code>
            </div>
          </div>
        </div>

        {/* Leyenda */}
        <div className="flex gap-4 text-[10px] justify-center mb-3">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-green-500/40 inline-block" /> Coincide
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-500/40 inline-block" /> Diferente
          </span>
        </div>
      </div>

      {/* Estadísticas */}
      <div className={cn("px-6 pb-4 transition-all duration-700", showDiff ? "opacity-100" : "opacity-0")}>
        <div className="bg-slate-900/70 border border-purple-500/20 rounded-xl p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <StatBox
              label="Caracteres comparados"
              value={String(totalChars)}
              color="text-slate-400"
              animate
            />
            <StatBox
              label="Caracteres coincidentes"
              value={String(matchingChars)}
              color="text-green-400"
              animate
            />
            <StatBox
              label="Similitud criptográfica"
              value={`${similarity.toFixed(2)}%`}
              color={similarity < 5 ? "text-red-400" : "text-yellow-400"}
              animate
              highlight
            />
          </div>
        </div>
      </div>

      {/* Conclusión */}
      <div className={cn("px-6 pb-6 text-center transition-all duration-1000 delay-300", showDiff ? "opacity-100" : "opacity-0")}>
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
          <p className="text-base font-bold text-purple-300 mb-1">
            Los hashes son <span className="text-pink-400">COMPLETAMENTE DISTINTOS</span>
          </p>
          <p className="text-xs text-slate-400 max-w-lg mx-auto">
            Por eso es <strong className="text-cyan-300">criptográficamente imposible</strong> falsificar
            una obra registrada en ChainRight. Si cambiás un solo byte del archivo,
            el hash resultante no coincide con ningún registro on-chain.
            <br />
            <span className="text-slate-500 mt-1 block">
              Así funciona SHA-256 + Merkle Trees. La blockchain no miente.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ═══════════ HELPERS ═══════════

interface DiffChar {
  char: string;
  match: boolean;
  index: number;
}

/** Compara dos hashes carácter por carácter. */
function computeHashDiff(a: string, b: string): DiffChar[] {
  const result: DiffChar[] = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    const ca = a[i] || "";
    const cb = b[i] || "";
    result.push({ char: ca || cb, match: ca === cb, index: i });
  }
  return result;
}

/** Renderiza una fila del diff con colores. */
function renderDiffRow(diff: DiffChar[], _which: "top" | "bottom"): React.ReactNode {
  return (
    <span className="inline-flex flex-wrap gap-px">
      {diff.map((d) => (
        <span
          key={d.index}
          className={cn(
            "inline-block w-[7px] text-center",
            d.match ? "text-green-400 bg-green-500/10" : "text-red-400 bg-red-500/10",
          )}
        >
          {d.char}
        </span>
      ))}
    </span>
  );
}

function StatBox({
  label,
  value,
  color,
  animate: _animate,
  highlight = false,
}: {
  label: string;
  value: string;
  color: string;
  animate?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={cn(
        "text-xl font-bold font-mono tabular-nums",
        color,
        highlight && "text-2xl",
      )}>
        {value}
      </span>
      <span className="text-[10px] text-slate-500 leading-tight max-w-[80px]">{label}</span>
    </div>
  );
}
