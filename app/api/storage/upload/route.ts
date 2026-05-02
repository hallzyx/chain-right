import { NextRequest, NextResponse } from "next/server";
import { uploadBuffer } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Upload endpoint robusto para 0G Storage.
 *
 * Usa multipart/form-data para evitar límites/fragilidad de base64 en Server Actions.
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Invalid file" },
        { status: 400 }
      );
    }

    const arr = await file.arrayBuffer();
    const data = new Uint8Array(arr);

    if (!data || data.length === 0) {
      return NextResponse.json(
        { success: false, error: "Empty file" },
        { status: 400 }
      );
    }

    const ext = file.type.includes("jpeg")
      ? "jpeg"
      : file.type.includes("webp")
      ? "webp"
      : "png";

    const result = await uploadBuffer(data, ext);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Error uploading file" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      merkleRoot: result.merkleRoot,
      transactionHash: result.transactionHash,
      sequenceNumber: result.sequenceNumber,
      submissionUrl: result.submissionUrl,
      fileStorageUrl: result.fileStorageUrl,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: `Upload API error: ${error.message}` },
      { status: 500 }
    );
  }
}
