import { NextRequest, NextResponse } from "next/server";
import { editImage } from "@/lib/compute";

export const runtime = "nodejs";

/**
 * POST /api/compute/edit — AI image editing via FormData.
 * Accepts: image (file) + prompt (string).
 * Avoids server action serialization limits for large base64.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const imageFile = formData.get("image") as File | null;
    const prompt = formData.get("prompt") as string | null;

    if (!imageFile || !prompt) {
      return NextResponse.json(
        { success: false, error: "Missing image or prompt" },
        { status: 400 }
      );
    }

    // Convert file to base64 data URL
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUrl = `data:${imageFile.type || "image/png"};base64,${base64}`;

    const result = await editImage(dataUrl, prompt);

    if (!result.success) {
      return NextResponse.json(result, { status: 422 });
    }

    // Convert imageData to imageUrl for client (avoids serialization issues)
    if (result.imageData) {
      result.imageUrl = `data:image/png;base64,${Buffer.from(result.imageData).toString("base64")}`;
      delete (result as any).imageData;
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Edit failed" },
      { status: 500 }
    );
  }
}
