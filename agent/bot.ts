/**
 * ChainRight Verification Agent — Entrypoint.
 *
 * Bot de Telegram que verifica la procedencia de imágenes
 * usando 0G Storage (Merkle Root) y 0G Chain (contrato on-chain).
 *
 * Uso:
 *   1. Creá un bot con @BotFather y obtené el token
 *   2. Seteá TELEGRAM_BOT_TOKEN en .env
 *   3. npx tsx agent/bot.ts
 */
import { Bot } from "grammy";
import type { BotContext } from "./context";
import { handleStart } from "./handlers/start";
import { handleHelp } from "./handlers/help";
import { handleStats } from "./handlers/stats";
import { handlePhoto, handleDocument } from "./handlers/verify";
import { appendLog } from "./memory/log";
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

// ─── Comandos ───
bot.command("start", handleStart);
bot.command("help", handleHelp);
bot.command("stats", handleStats);

// ─── Handler de imágenes (foto) ───
bot.on(":photo", async (ctx) => {
  const userId = ctx.from?.id;
  const username = ctx.from?.username || ctx.from?.first_name;

  if (!userId) {
    await ctx.reply("⚠️ Could not identify user.");
    return;
  }

  await handlePhoto(
    bot,
    userId,
    username,
    ctx.message.photo,
    (text, opts) => ctx.reply(text, opts as any),
    ctx.chat.id
  );
});

// ─── Handler de documentos (sin comprimir) ───
bot.on(":document", async (ctx) => {
  const userId = ctx.from?.id;
  const username = ctx.from?.username || ctx.from?.first_name;

  if (!userId) {
    await ctx.reply("⚠️ Could not identify user.");
    return;
  }

  const doc = ctx.message.document;
  await handleDocument(
    bot,
    userId,
    username,
    doc.file_id,
    doc.file_name,
    doc.mime_type,
    (text, opts) => ctx.reply(text, opts as any),
    ctx.chat.id
  );
});

// ─── Mensaje genérico (cuando no es foto ni comando) ───
bot.on("message", async (ctx) => {
  const userId = ctx.from?.id;
  const username = ctx.from?.username || ctx.from?.first_name;

  await ctx.reply(
    [
      "👋 Send me an <b>image</b> and I'll verify its cryptographic provenance on 0G Chain.",
      "",
      "Commands: /start | /help | /stats",
    ].join("\n"),
    { parse_mode: "HTML" }
  );

  await appendLog({
    userId: userId || 0,
    username,
    action: "command",
    verified: false,
    message: "Unknown message (not a photo)",
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

  // Verificar que el contrato está configurado
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
