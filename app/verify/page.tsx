"use client";

import { useState, useRef } from "react";
import { actionVerifyImage, actionComputeMerkleRoot } from "@/app/actions";
import { cn } from "@/lib/utils";
import { bufferToDataUrl, modifyOnePixel } from "@/lib/utils";
import type { VerificationResult } from "@/lib/types";

/**
 * Página para verificar la autenticidad de una imagen.
 * Incluye el Wow Moment: modificar un píxel cambia completamente el hash.
 */
export default function VerifyPage() {
  const [step, setStep] = useState<"upload" | "verifying" | "result">("upload");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [originalBase64, setOriginalBase64] = useState<string | null>(null);
  const [originalData, setOriginalData] = useState<Uint8Array | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [originalRoot, setOriginalRoot] = useState<string | null>(null);
  const [modifiedRoot, setModifiedRoot] = useState<string | null>(null);
  const [showWowMoment, setShowWowMoment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ============ Handle File Upload ============

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setUploadedImage(dataUrl);
      setOriginalBase64(dataUrl);

      // También guardamos el ArrayBuffer para luego modificarlo
      const arrayBuffer = await file.arrayBuffer();
      setOriginalData(new Uint8Array(arrayBuffer));
    };
    reader.readAsDataURL(file);
  }

  // ============ Verificar ============

  async function handleVerify() {
    if (!originalBase64) return;

    setError(null);
    setStep("verifying");

    try {
      // 1. Calcular el Merkle Root original (para el wow moment)
      const rootResult = await actionComputeMerkleRoot(originalBase64);
      if (rootResult.success && rootResult.merkleRoot) {
        setOriginalRoot(rootResult.merkleRoot);
      }

      // 2. Verificar en el contrato
      const result = await actionVerifyImage(originalBase64);
      setVerificationResult(result);
      setStep("result");
    } catch (err: any) {
      setError(err.message || "Error inesperado");
      setStep("upload");
    }
  }

  // ============ Wow Moment: Modificar un Píxel ============

  function handleWowMoment() {
    if (!originalData) return;

    // Modificamos UN SOLO PÍXEL (en realidad un byte del archivo)
    const modified = modifyOnePixel(originalData);

    // Convertimos a data URL para mostrar
    const modifiedBase64 = bufferToDataUrl(modified, "image/png");

    // Calculamos el nuevo Merkle Root
    actionComputeMerkleRoot(modifiedBase64).then((result) => {
      if (result.success && result.merkleRoot) {
        setModifiedRoot(result.merkleRoot);
      }
    });

    setShowWowMoment(true);
  }

  // ============ Reset ============

  function handleReset() {
    setStep("upload");
    setUploadedImage(null);
    setOriginalBase64(null);
    setOriginalData(null);
    setVerificationResult(null);
    setOriginalRoot(null);
    setModifiedRoot(null);
    setShowWowMoment(false);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">
          Verificar Autenticidad
        </h1>
        <p className="text-slate-400">
          Subí una imagen y verificá si está registrada en ChainRight.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-8">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* ============ Paso 1: Upload ============ */}
      {step === "upload" && !uploadedImage && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all",
            "border-slate-700 hover:border-cyan-500/50 hover:bg-slate-900/50"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="text-5xl mb-4">🖼️</div>
          <p className="text-lg font-medium text-slate-300 mb-2">
            Click para subir una imagen
          </p>
          <p className="text-sm text-slate-500">
            PNG, JPG, WebP — cualquier formato
          </p>
        </div>
      )}

      {/* Imagen Preview */}
      {uploadedImage && step === "upload" && (
        <div className="space-y-8">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
            <img
              src={uploadedImage}
              alt="Imagen a verificar"
              className="w-full h-auto max-h-96 object-contain"
            />
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleReset}
              className={cn(
                "flex-1 py-4 rounded-xl font-semibold transition-all",
                "border-2 border-slate-700 text-slate-300 hover:border-slate-600"
              )}
            >
              ← Cambiar imagen
            </button>
            <button
              onClick={handleVerify}
              className={cn(
                "flex-1 py-4 rounded-xl font-semibold transition-all",
                "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/25"
              )}
            >
              🔍 Verificar
            </button>
          </div>
        </div>
      )}

      {/* ============ Verificando ============ */}
      {step === "verifying" && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-16 text-center">
          <div className="text-5xl mb-6 animate-pulse">🔍</div>
          <p className="text-lg text-slate-300">Verificando autenticidad...</p>
          <p className="text-sm text-slate-500 mt-2">Calculando Merkle Root + consultando contrato on-chain</p>
        </div>
      )}

      {/* ============ Resultado ============ */}
      {step === "result" && verificationResult && (
        <div className="space-y-8">
          {/* Resultado Principal */}
          <div
            className={cn(
              "rounded-2xl p-8 text-center",
              verificationResult.verified
                ? "bg-green-500/10 border border-green-500/20"
                : "bg-slate-900/50 border border-slate-800"
            )}
          >
            <div className="text-6xl mb-4">
              {verificationResult.verified ? "✅" : "❌"}
            </div>
            <h2
              className={cn(
                "text-2xl font-bold mb-2",
                verificationResult.verified ? "text-green-400" : "text-slate-300"
              )}
            >
              {verificationResult.verified
                ? "Autenticidad Confirmada"
                : "Sin Registro Encontrado"}
            </h2>
            <p className="text-slate-400">{verificationResult.message}</p>
          </div>

          {/* Merkle Root */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <span>🔐</span> Merkle Root Calculado
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Este es el hash único de tu imagen. Cada píxel influye en este valor.
            </p>
            <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
              <code className="text-sm text-cyan-400 break-all">
                {verificationResult.merkleRoot}
              </code>
            </div>
          </div>

          {/* Datos de Procedencia (si existe) */}
          {verificationResult.verified && verificationResult.provenance && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <span>📋</span> Datos de Procedencia On-Chain
              </h3>
              <div className="space-y-3 text-sm">
                <DataRow label="Creador" value={verificationResult.provenance.creator} isHash />
                <DataRow label="Modelo" value={verificationResult.provenance.model} />
                <DataRow label="Prompt" value={verificationResult.provenance.prompt} />
                <DataRow label="ZG-Res-Key" value={verificationResult.provenance.zkResKey || "(no disponible)"} isHash />
                <DataRow
                  label="Fecha de Registro"
                  value={new Date(Number(verificationResult.provenance.timestamp) * 1000).toLocaleString("es-AR")}
                />
              </div>
            </div>
          )}

          {/* ============ WOW MOMENT ============ */}
          <div className="mt-8">
            {!showWowMoment ? (
              <button
                onClick={handleWowMoment}
                className={cn(
                  "w-full py-4 rounded-xl font-semibold transition-all",
                  "bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 shadow-lg shadow-purple-500/25"
                )}
              >
                🤯 Ver Wow Moment: Modificar UN PÍXEL
              </button>
            ) : (
              <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-6">
                <h3 className="font-bold text-lg mb-4 text-center">
                  🤯 Wow Moment: Un Píxel = Cambio Total
                </h3>
                <p className="text-sm text-slate-400 mb-6 text-center">
                  Modificamos <strong>UN SOLO PÍXEL</strong> de la imagen. Mirá qué pasa con el Merkle Root:
                </p>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Original */}
                  <div className="bg-slate-900/50 rounded-xl p-4">
                    <p className="text-xs text-slate-500 mb-2 font-medium">ORIGINAL</p>
                    <div className="bg-slate-950 border border-slate-700 rounded-lg p-3 mb-2">
                      <code className="text-xs text-green-400 break-all">
                        {originalRoot}
                      </code>
                    </div>
                  </div>

                  {/* Modificado */}
                  <div className="bg-slate-900/50 rounded-xl p-4">
                    <p className="text-xs text-slate-500 mb-2 font-medium">
                      MODIFICADO (1 píxel)
                    </p>
                    <div className="bg-slate-950 border border-slate-700 rounded-lg p-3 mb-2">
                      <code className="text-xs text-red-400 break-all">
                        {modifiedRoot || "Calculando..."}
                      </code>
                    </div>
                  </div>
                </div>

                <div className="mt-6 text-center">
                  <p className="text-lg font-semibold text-purple-400">
                    Los hashes son COMPLETAMENTE DISTINTOS.
                  </p>
                  <p className="text-sm text-slate-400 mt-2">
                    Esto es lo que hace imposible falsificar una obra registrada en ChainRight.
                    Si cambias un solo píxel, el hash no coincide con ningún registro on-chain.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Volver */}
          <button
            onClick={handleReset}
            className={cn(
              "w-full py-4 rounded-xl font-semibold transition-all",
              "border-2 border-slate-700 text-slate-300 hover:border-slate-600"
            )}
          >
            ← Verificar otra imagen
          </button>
        </div>
      )}
    </div>
  );
}

function DataRow({
  label,
  value,
  isHash = false,
}: {
  label: string;
  value: string;
  isHash?: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-2">
      <span className="text-slate-500 flex-shrink-0 w-28">{label}:</span>
      <span
        className={cn(
          "text-slate-300",
          isHash && "font-mono text-xs break-all"
        )}
      >
        {value}
      </span>
    </div>
  );
}
