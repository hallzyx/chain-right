/**
 * ChainRight Verification Agent — Autonomous AI Agent.
 *
 * Usa DeepSeek Function Calling para decidir autónomamente
 * qué acciones tomar basándose en el mensaje del usuario.
 *
 * Flujo:
 *   Usuario → agentThink() → DeepSeek decide tool → ejecutamos tool
 *   → DeepSeek genera respuesta final con todos los detalles
 */
import { Bot, InputFile } from "grammy";
import type { BotContext } from "./context";
import { verifyImageData, handlePhoto, handleDocument } from "./handlers/verify";
import { handleHelp } from "./handlers/help";
import { handleStats } from "./handlers/stats";
import { handleStart } from "./handlers/start";
import { agentThink, agentRespond } from "./utils/nlp";
import type { ToolCall } from "./utils/nlp";
import { appendLog } from "./memory/log";
import { getUserStats } from "./memory/kv";
import { formatHelp, formatStats, formatError } from "./utils/format";
import "dotenv/config";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN not set in .env");
  process.exit(1);
}

const bot = new Bot<BotContext>(BOT_TOKEN);

bot.command("start", handleStart);
bot.command("help", handleHelp);
bot.command("stats", handleStats);

// ─── Ejecutor de tools (agente autónomo) ───
async function executeTool(
  toolCall: ToolCall,
  ctx: {
    userId: number;
    username?: string;
    chatId: number;
    photoSizes?: { file_id: string; width: number; height: number }[];
    document?: { file_id: string; file_name?: string; mime_type?: string };
    reply: (text: string, opts?: Record<string, unknown>) => Promise<unknown>;
  }
): Promise<{ content: string; pdfBuffer?: Buffer }> {
  const { name, arguments: args } = toolCall;

  switch (name) {
    case "verify_image": {
      const hasImage = (args as any).has_image === true;

      if (!hasImage || (!ctx.photoSizes && !ctx.document)) {
        return {
          content: "No image was provided with the verification request. Tell the user to send a photo or document file (PNG, JPG, WebP).",
        };
      }

      // Ejecutar verificación "headless" → obtener datos
      let fileId: string;
      let source: "photo" | "document";

      if (ctx.document) {
        fileId = ctx.document.file_id;
        source = "document";
      } else if (ctx.photoSizes) {
        const best = ctx.photoSizes[ctx.photoSizes.length - 1];
        fileId = best.file_id;
        source = "photo";
      } else {
        return { content: "No image found. Ask user to send a photo." };
      }

      const data = await verifyImageData(bot, ctx.userId, ctx.username, source, fileId);

      if (!data.success || data.error) {
        return {
          content: `Verification failed: ${data.error || "Unknown error"}. Tell the user the error message and suggest trying again.`,
        };
      }

      // Construir respuesta rica con TODOS los detalles para DeepSeek
      let details = `Verification result for image:\n`;
      details += `Merkle Root: ${data.merkleRoot}\n`;
      details += `Verified: ${data.verified ? "YES" : "NO"}\n`;

      if (data.verified && data.provenance) {
        const p = data.provenance;
        details += `Creator: ${p.creator}\n`;
        details += `AI Model: ${p.model}\n`;
        details += `Prompt: ${p.prompt}\n`;
        details += `ZK Resource Key: ${p.zkResKey}\n`;
        details += `Sequence: ${p.sequenceNumber || "N/A"}\n`;
        details += `Timestamp: ${new Date(Number(p.timestamp) * 1000).toLocaleString("en-US")}\n`;
        if (data.chainScanUrl) details += `Mint Tx URL: ${data.chainScanUrl}\n`;
        if (data.nftUrl) details += `NFT URL: ${data.nftUrl}\n`;
        if (data.storageScanUrl) details += `StorageScan URL: ${data.storageScanUrl}\n`;
        if (data.sourceIsPhoto) details += `WARNING: Sent as photo (compressed). For exact verification, send as document.\n`;
      }

      details += `\nINSTRUCTIONS: Reply to the user with EVERY single detail above. Do NOT use Markdown (** or __ or *). Use plain text with emojis. Always include ALL fields: Creator, AI Model, Prompt, ZK Res Key, Sequence, Timestamp, Merkle Root, and ALL the URLs (Mint Tx on ChainScan, View NFT on ChainScan, View on StorageScan) as plain URLs (not markdown links). Format like this:
      
✅ AUTHENTICITY CONFIRMED (or ❌ NO RECORD FOUND)
This artwork has an immutable record on 0G Chain.

👤 Creator: [value]
🤖 AI Model: [value]
📝 Prompt: [value]
🔑 ZK Res Key: [value]
#️⃣ Sequence: [value]
🕐 Timestamp: [value]

🔐 Merkle Root:
[merkle root]

⛓️ View Mint Tx on ChainScan
[URL]
🎨 View NFT on ChainScan  
[URL]
☁️ View on StorageScan
[URL]

No markdown. Just emojis and text. Include links as plain URLs.`;

      return { content: details, pdfBuffer: data.pdfBuffer };
    }

    case "show_help": {
      return { content: formatHelp() };
    }

    case "show_stats": {
      const stats = await getUserStats(ctx.userId);
      return { content: formatStats(stats) };
    }

    case "chat_reply": {
      const msg = (args as any).message || "";
      return {
        content: `User said: "${msg}". Reply in a friendly, short, helpful manner. Remind them you verify images. Don't make up features.`,
      };
    }

    default:
      return { content: "Unknown request. Ask the user to try again." };
  }
}

// ─── Handler unificado (foto) ───
bot.on(":photo", async (ctx) => {
  const userId = ctx.from?.id;
  const username = ctx.from?.username || ctx.from?.first_name;
  if (!userId) return;

  const caption = ctx.message.caption || "";
  const chatId = ctx.chat.id;

  const { toolCalls } = await agentThink(caption, true);

  if (toolCalls.length > 0) {
    for (const toolCall of toolCalls) {
      const result = await executeTool(toolCall, {
        userId, username, chatId,
        photoSizes: ctx.message.photo,
        reply: (text, opts) => ctx.reply(text, opts as any),
      });

      // DeepSeek genera la respuesta final incluyendo TODOS los detalles
      const finalResponse = await agentRespond(caption, toolCall, result.content);
      await ctx.reply(finalResponse, { disable_web_page_preview: true });

      // Enviar PDF si existe
      if (result.pdfBuffer) {
        try {
          await bot.api.sendDocument(chatId, new InputFile(result.pdfBuffer, "chainright-certificate.pdf"), {
            caption: "📄 Certificate of Authenticity",
          });
        } catch (err) {
          console.error("Failed to send PDF:", err);
        }
      }
    }
    return;
  }

  // Fallback: verificar directamente
  await handlePhoto(bot, userId, username, ctx.message.photo, (text, opts) => ctx.reply(text, opts as any), chatId);
});

// ─── Handler unificado (documento) ───
bot.on(":document", async (ctx) => {
  const userId = ctx.from?.id;
  const username = ctx.from?.username || ctx.from?.first_name;
  if (!userId) return;

  const doc = ctx.message.document;
  const caption = ctx.message.caption || "";
  const chatId = ctx.chat.id;

  const imageMimes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
  if (doc.mime_type && !imageMimes.includes(doc.mime_type)) return;

  const { toolCalls } = await agentThink(caption, true);

  if (toolCalls.length > 0) {
    for (const toolCall of toolCalls) {
      const result = await executeTool(toolCall, {
        userId, username, chatId,
        document: { file_id: doc.file_id, file_name: doc.file_name, mime_type: doc.mime_type },
        reply: (text, opts) => ctx.reply(text, opts as any),
      });

      const finalResponse2 = await agentRespond(caption, toolCall, result.content);
      await ctx.reply(finalResponse2, { disable_web_page_preview: true });

      if (result.pdfBuffer) {
        try {
          await bot.api.sendDocument(chatId, new InputFile(result.pdfBuffer, "chainright-certificate.pdf"), {
            caption: "📄 Certificate of Authenticity",
          });
        } catch (err) {
          console.error("Failed to send PDF:", err);
        }
      }
    }
    return;
  }

  await handleDocument(bot, userId, username, doc.file_id, doc.file_name, doc.mime_type, (text, opts) => ctx.reply(text, opts as any), chatId);
});

// ─── Mensajes de solo texto ───
bot.on("message", async (ctx) => {
  const userId = ctx.from?.id;
  const username = ctx.from?.username || ctx.from?.first_name;
  const text = ctx.message.text || "";
  if (!text.trim()) return;

  const chatId = ctx.chat.id;
  const { textResponse, toolCalls } = await agentThink(text, false);

  if (toolCalls.length > 0) {
    for (const toolCall of toolCalls) {
      const result = await executeTool(toolCall, {
        userId, username, chatId,
        reply: (t, opts) => ctx.reply(t, opts as any),
      });

      const finalResponse3 = await agentRespond(text, toolCall, result.content);
      await ctx.reply(finalResponse3, { disable_web_page_preview: true });
    }
    return;
  }

  if (textResponse) {
    await ctx.reply(textResponse, { parse_mode: "HTML", disable_web_page_preview: true });
    return;
  }

  await ctx.reply("Send me an image and I'll verify it! 🔍", { parse_mode: "HTML" });
});

bot.catch((err) => console.error("Bot error:", err));

async function main() {
  console.log("🤖 ChainRight Autonomous Agent starting...");
  console.log("   NLP:", process.env.DEEPSEEK_API_KEY ? "DeepSeek Function Calling" : "Keyword fallback");
  console.log("   Press Ctrl+C to stop");
  await bot.start();
}

main().catch((err) => { console.error("Failed:", err); process.exit(1); });
