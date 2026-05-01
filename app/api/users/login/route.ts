import { NextRequest, NextResponse } from "next/server";
import { upsertUser } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Registra/actualiza login por wallet en db.json.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const wallet = String(body?.wallet || "").trim();

    if (!wallet || !wallet.startsWith("0x")) {
      return NextResponse.json({ success: false, error: "Wallet inválida" }, { status: 400 });
    }

    const user = await upsertUser(wallet);
    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
