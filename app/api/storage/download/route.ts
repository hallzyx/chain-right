import { NextRequest, NextResponse } from "next/server";
import { downloadFile } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Descarga un archivo de 0G Storage por Merkle Root y lo devuelve como base64.
 * Usado para mostrar imágenes de obras existentes en el frontend.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { merkleRoot } = body as { merkleRoot: string };

    if (!merkleRoot) {
      return NextResponse.json(
        { success: false, error: "Merkle Root required" },
        { status: 400 }
      );
    }

    const result = await downloadFile(merkleRoot);

    if (!result.success || !result.data) {
      return NextResponse.json(
        { success: false, error: result.error || "Failed to download file" },
        { status: 500 }
      );
    }

    // Convertir a base64
    const base64 = Buffer.from(result.data).toString("base64");
    const dataUrl = `data:image/png;base64,${base64}`;

    return NextResponse.json({ success: true, dataUrl });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: `Download API error: ${error.message}` },
      { status: 500 }
    );
  }
}
