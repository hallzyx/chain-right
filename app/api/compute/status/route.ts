import { NextRequest, NextResponse } from "next/server";
import { getComputeStatus, ensureComputeAccount, depositFund } from "@/lib/compute";

export const runtime = "nodejs";

/**
 * Obtiene el estado completo del sistema 0G Compute.
 * Incluye: balance on-chain, compute ledger, providers disponibles.
 */
export async function GET() {
  try {
    const status = await getComputeStatus();
    return NextResponse.json({ success: true, status });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Crea la cuenta de Compute si no existe.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    if (body.action === "deposit") {
      const amount = body.amount || 1.0;
      const result = await depositFund(amount);
      return NextResponse.json({ 
        success: result, 
        message: result ? `Deposited ${amount} 0G to compute ledger` : "Failed to deposit funds" 
      });
    }

    const result = await ensureComputeAccount();
    return NextResponse.json({ success: result.success, message: result.message, created: result.created });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
