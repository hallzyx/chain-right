"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle } from "lucide-react";

interface WowMomentProps {
  originalRoot: string | null;
  modifiedRoot: string | null;
  originalImage: string | null;
}

/**
 * Experiencia visual "Wow Moment" — Black & Amber Edition.
 * Demuestra cómo modificar UN SOLO PÍXEL cambia COMPLETAMENTE el hash.
 */
export function WowMoment({
  originalRoot,
  modifiedRoot,
  originalImage,
}: WowMomentProps) {
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
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // Calcular diff real
  const diff = computeHashDiff(originalRoot || "", modifiedRoot || "");
  const matchingChars = diff.filter((d) => d.match).length;
  const totalChars = diff.length || 1;

  return (
    <div className="bg-[#141414] border border-white/5 overflow-hidden">
      {/* Header */}
      <div className="text-center px-6 pt-8 pb-4">
        <h3 className="text-xl font-[family-name:var(--font-newsreader)] text-[#f0e0d1] mb-2">
          Wow Moment: 1 Single Pixel = Total Change
        </h3>
        <p className="text-sm text-[#888]">
          We modified <strong className="text-[#f59e0b]">1 byte</strong> of the
          file. The images look <strong className="text-[#8fd5ff]">identical</strong>{" "}
          to the human eye.
        </p>
      </div>

      {/* Split-screen con imágenes + scan line */}
      <div className="relative grid grid-cols-2 gap-px mx-6 mt-4 overflow-hidden border border-white/5 bg-[#0a0a0a]">
        {/* Scan line */}
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            background: `linear-gradient(to bottom, transparent ${scanPos - 0.5}%, rgba(245,158,11,0.15) ${scanPos}%, transparent ${scanPos + 0.5}%)`,
          }}
        />

        {/* Original */}
        <div className="relative bg-[#0a0a0a] p-3">
          <div className="absolute top-2 left-2 z-20 bg-[#f59e0b]/10 border border-[#f59e0b]/20 px-2 py-0.5 text-[10px] font-bold text-[#f59e0b]">
            ORIGINAL
          </div>
          {originalImage ? (
            <img
              src={originalImage}
              alt="Original"
              className="w-full h-48 object-contain opacity-80"
            />
          ) : (
            <div className="w-full h-48 flex items-center justify-center text-[#555] text-xs">
              No image
            </div>
          )}
          {/* Píxel modificado indicator */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
            <div className="w-6 h-6 border-2 border-[#f59e0b]/60 animate-ping" />
          </div>
        </div>

        {/* Modificada */}
        <div className="relative bg-[#0a0a0a] p-3">
          <div className="absolute top-2 right-2 z-20 bg-[#ffb4ab]/10 border border-[#ffb4ab]/20 px-2 py-0.5 text-[10px] font-bold text-[#ffb4ab]">
            MODIFIED
          </div>
          {originalImage ? (
            <img
              src={originalImage}
              alt="Modificada"
              className="w-full h-48 object-contain opacity-80"
            />
          ) : (
            <div className="w-full h-48 flex items-center justify-center text-[#555] text-xs">
              No image
            </div>
          )}
          {/* Píxel modificado indicator */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
            <div className="w-6 h-6 border-2 border-[#ffb4ab]/80 animate-ping" />
            <div className="absolute inset-0 w-3 h-3 bg-[#ffb4ab]/80 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Separador visual */}
      <div className="flex items-center gap-2 px-6 mt-4">
        <div className="flex-1 h-px bg-[#333]" />
        <span className="text-[10px] text-[#555] font-mono uppercase tracking-widest">
          CRYPTOGRAPHIC ANALYSIS
        </span>
        <div className="flex-1 h-px bg-[#333]" />
      </div>

      {/* Hash Diff animado */}
      <div
        className={cn(
          "px-6 pt-3 pb-4 transition-all duration-500",
          showDiff
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4"
        )}
      >
        <div className="grid grid-cols-2 gap-4 mb-3">
          {/* Hash original */}
          <div>
            <p className="text-[10px] text-[#f59e0b] font-bold mb-1.5">
              ORIGINAL HASH
            </p>
            <div className="bg-[#0a0a0a] border border-white/5 p-3">
              <code className="text-[11px] leading-relaxed break-all font-mono">
                {originalRoot
                  ? renderDiffRow(diff, "top")
                  : "Calculating..."}
              </code>
            </div>
          </div>

          {/* Hash modificado */}
          <div>
            <p className="text-[10px] text-[#ffb4ab] font-bold mb-1.5">
              MODIFIED HASH
            </p>
            <div className="bg-[#0a0a0a] border border-white/5 p-3">
              <code className="text-[11px] leading-relaxed break-all font-mono">
                {modifiedRoot
                  ? renderDiffRow(diff, "bottom")
                  : "Computing..."}
              </code>
            </div>
          </div>
        </div>

        {/* Leyenda */}
        <div className="flex gap-4 text-[10px] justify-center mb-3">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-[#f59e0b]/40 inline-block" />{" "}
            Match
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-[#ffb4ab]/40 inline-block" />{" "}
            Different
          </span>
        </div>
      </div>

      {/* Estadísticas */}
      <div
        className={cn(
          "px-6 pb-4 transition-all duration-700",
          showDiff ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="bg-[#0a0a0a] border border-white/5 p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <StatBox
              label="Chars Compared"
              value={String(totalChars)}
              color="text-[#888]"
            />
            <StatBox
              label="Matching Chars"
              value={String(matchingChars)}
              color="text-[#f59e0b]"
            />
            <StatBox
              label="Cryptographic Similarity"
              value={`${similarity.toFixed(2)}%`}
              color={similarity < 5 ? "text-[#ffb4ab]" : "text-[#f59e0b]"}
              highlight
            />
          </div>
        </div>
      </div>

      {/* Conclusión */}
      <div
        className={cn(
          "px-6 pb-8 text-center transition-all duration-1000 delay-300",
          showDiff ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="bg-[#f59e0b]/5 border border-[#f59e0b]/20 p-4">
          <p className="text-base font-bold text-[#f0e0d1] mb-1">
            The hashes are{" "}
            <span className="text-[#ffb4ab]">COMPLETELY DIFFERENT</span>
          </p>
          <p className="text-xs text-[#888] max-w-lg mx-auto leading-relaxed">
            This is why it is{" "}
            <strong className="text-[#8fd5ff]">cryptographically impossible</strong>{" "}
            to forge a work registered on ChainRight. If you change a single
            byte of the file, the resulting hash won&apos;t match any on-chain
            record.
            <br />
            <span className="text-[#555] mt-1 block">
              This is how SHA-256 + Merkle Trees work. The blockchain
              doesn&apos;t lie.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ═══════════ HELPERS ═══════════

interface DiffChar {
  origChar: string;
  modChar: string;
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
    result.push({
      origChar: ca,
      modChar: cb,
      match: ca === cb,
      index: i,
    });
  }
  return result;
}

/** Renderiza una fila del diff con colores.
 *  ORIGINAL (top): caracteres que se modificarán → ámbar
 *  MODIFICADO (bottom): caracteres cambiados → rosa
 *  Iguales en ambos → gris tenue
 */
function renderDiffRow(
  diff: DiffChar[],
  which: "top" | "bottom"
): React.ReactNode {
  return (
    <span className="inline-flex flex-wrap gap-px">
      {diff.map((d) => {
        const char = which === "top" ? d.origChar : d.modChar;
        return (
          <span
            key={d.index}
            className={cn(
              "inline-block w-[7px] text-center transition-colors duration-300",
              d.match
                ? "text-[#555]"
                : which === "top"
                  ? "text-[#f59e0b] bg-[#f59e0b]/15 font-bold"
                  : "text-[#ffb4ab] bg-[#ffb4ab]/15 font-bold"
            )}
          >
            {char}
          </span>
        );
      })}
    </span>
  );
}

function StatBox({
  label,
  value,
  color,
  highlight = false,
}: {
  label: string;
  value: string;
  color: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className={cn(
          "font-bold font-mono tabular-nums",
          color,
          highlight ? "text-2xl" : "text-xl"
        )}
      >
        {value}
      </span>
      <span className="text-[10px] text-[#555] leading-tight max-w-[80px]">
        {label}
      </span>
    </div>
  );
}
