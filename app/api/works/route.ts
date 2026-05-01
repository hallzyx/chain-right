import { NextRequest, NextResponse } from "next/server";
import { getWorksByWallet, saveWork } from "@/lib/db";
import type { DbWork } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Lista obras por wallet.
 */
export async function GET(req: NextRequest) {
  try {
    const wallet = req.nextUrl.searchParams.get("wallet") || "";
    if (!wallet || !wallet.startsWith("0x")) {
      return NextResponse.json({ success: false, error: "Wallet requerida" }, { status: 400 });
    }

    const works = await getWorksByWallet(wallet);
    return NextResponse.json({ success: true, works });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * Guarda obra creada/minteada en db.json.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<DbWork>;
    if (!body.wallet || !body.merkleRoot || !body.prompt) {
      return NextResponse.json(
        { success: false, error: "Campos requeridos faltantes" },
        { status: 400 }
      );
    }

    const work: DbWork = {
      id: body.id || `wrk_${Date.now()}`,
      wallet: body.wallet,
      title: body.title || "Obra sin título",
      prompt: body.prompt,
      source: body.source || "0g-compute",
      model: body.model || "unknown",
      imageDataUrl: body.imageDataUrl || "",
      merkleRoot: body.merkleRoot,
      storageTxHash: body.storageTxHash,
      contractAddress: body.contractAddress || process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "",
      tokenId: body.tokenId,
      mintTxHash: body.mintTxHash,
      status: body.status || "minted",
      createdAt: body.createdAt || new Date().toISOString(),
    };

    const saved = await saveWork(work);
    return NextResponse.json({ success: true, work: saved });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
