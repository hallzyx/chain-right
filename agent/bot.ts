/**
 * ChainRight Verification Agent — Entrypoint.
 *
 * Bot de Telegram con capacidades de lenguaje natural (DeepSeek).
 * Verifica procedencia de imágenes usando 0G Storage + 0G Chain.
 *
 * Uso:
 *   1. Creá un bot con @BotFather y obtené el token
 *   2. Seteá TELEGRAM_BOT_TOKEN y DEEPSEEK_API_KEY en .env
 *   3. npm run agent
 */
import { Bot } from "grammy";
import type { BotContext } from "./context";
import { handleStart } from "./handlers/start";
import { handleHelp } from "./handlers/help";
import { handleStats } from "./handlers/stats";
import { handlePhoto, handleDocument } from "./handlers/verify";
import { detectIntent, chatResponse } from "./utils/nlp";
import { getUserStats } from "./memory/kv";
import { appendLog } from "./memory/log";
import { formatStats } from "./utils/format";
import "dotenv/config";

// ─── Configuración ───
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN not set in .env");
  console.error("   1. Create a bot with @BotFather on Telegram");
  console.error("   2. Copy the token");
  console.error('   3. Add TELEGRAM_BOT_TOKEN="your-token" to .env');
  process.exit(1);
}

const bot = new Bot<BotContext>(BOT_TOKEN);

// ─── Comandos explícitos ───
bot.command("start", handleStart);
bot.command("help", handleHelp);
bot.command("stats", handleStats);

// ─── Handler de imágenes (foto) con NLP ───
bot.on(":photo", async (ctx) => {
  const userId = ctx.from?.id;
  const username = ctx.from?.username || ctx.from?.first_name;
  if (!userId) return;

  const caption = ctx.message.caption || "";

  // Si no hay caption, verificar directamente
  if (!caption.trim()) {
    await handlePhoto(bot, userId, username, ctx.message.photo, (text, opts) => ctx.reply(text, opts as any), ctx.chat.id);
    return;
  }

  // Detectar intención con DeepSeek NLP
  const intent = await detectIntent(caption);

  if (intent === "verify") {
    await handlePhoto(bot, userId, username, ctx.message.photo, (text, opts) => ctx.reply(text, opts as any), ctx.chat.id);
  } else if (intent === "help") {
    await handleHelp(ctx as any);
  } else if (intent === "stats") {
    await handleStats(ctx as any);
  } else {
    // Intención ambigua: verificamos igual porque hay una imagen
    const reply = await chatResponse(caption);
    await ctx.reply(reply, { parse_mode: "HTML" });
    await handlePhoto(bot, userId, username, ctx.message.photo, (text, opts) => ctx.reply(text, opts as any), ctx.chat.id);
  }
});

// ─── Handler de documentos (sin comprimir) con NLP ───
bot.on(":document", async (ctx) => {
  const userId = ctx.from?.id;
  const username = ctx.from?.username || ctx.from?.first_name;
  if (!userId) return;

  const doc = ctx.message.document;
  const caption = ctx.message.caption || "";

  // Si no es imagen, ignorar
  const imageMimes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
  if (doc.mime_type && !imageMimes.includes(doc.mime_type)) return;

  // Si no hay caption, verificar directamente
  if (!caption.trim()) {
    await handleDocument(bot, userId, username, doc.file_id, doc.file_name, doc.mime_type, (text, opts) => ctx.reply(text, opts as any), ctx.chat.id);
    return;
  }

  const intent = await detectIntent(caption);

  if (intent === "verify") {
    await handleDocument(bot, userId, username, doc.file_id, doc.file_name, doc.mime_type, (text, opts) => ctx.reply(text, opts as any), ctx.chat.id);
  } else if (intent === "help") {
    await handleHelp(ctx as any);
  } else if (intent === "stats") {
    await handleStats(ctx as any);
  } else {
    const reply = await chatResponse(caption);
    await ctx.reply(reply, { parse_mode: "HTML" });
    await handleDocument(bot, userId, username, doc.file_id, doc.file_name, doc.mime_type, (text, opts) => ctx.reply(text, opts as any), ctx.chat.id);
  }
});

// ─── Mensajes de solo texto — lenguaje natural ───
bot.on("message", async (ctx) => {
  const userId = ctx.from?.id;
  const username = ctx.from?.username || ctx.from?.first_name;
  const text = ctx.message.text || "";

  if (!text.trim()) return;

  const intent = await detectIntent(text);

  if (intent === "verify") {
    // Quiere verificar pero no envió imagen
    await ctx.reply(
      "📸 Send me the <b>image</b> you want to verify and I'll check its on-chain provenance!",
      { parse_mode: "HTML" }
    );
  } else if (intent === "help") {
    await handleHelp(ctx as any);
  } else if (intent === "stats") {
    await handleStats(ctx as any);
  } else {
    // Respuesta conversacional con DeepSeek
    const reply = await chatResponse(text);
    await ctx.reply(reply, { parse_mode: "HTML" });
  }

  await appendLog({
    userId: userId || 0,
    username,
    action: "command",
    verified: false,
    message: `NLP: ${intent || "unknown"} — "${text.slice(0, 80)}"`,
  });
});

// ─── Error handler ───
bot.catch((err) => {
  console.error("Bot error:", err);
});

// ─── Startup ───
async function main() {
  console.log("🤖 ChainRight Verification Agent starting...");
  console.log("   Token:", BOT_TOKEN ? `${BOT_TOKEN.slice(0, 8)}...` : "NOT SET");
  console.log("   NLP:", process.env.DEEPSEEK_API_KEY ? "DeepSeek enabled" : "Keyword fallback");

  const contractAddr = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (contractAddr && contractAddr !== "0x0000000000000000000000000000000000000000") {
    console.log(`   Contract: ${contractAddr.slice(0, 10)}...`);
  } else {
    console.warn("   ⚠️  NEXT_PUBLIC_CONTRACT_ADDRESS not set — on-chain verification disabled");
  }

  console.log("   Press Ctrl+C to stop");
  await bot.start();
}

main().catch((err) => {
  console.error("Failed to start bot:", err);
  process.exit(1);
});
