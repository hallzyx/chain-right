/**
 * Handler para el comando /start.
 */
import type { BotContext } from "../context";
import { formatWelcome } from "../utils/format";

export async function handleStart(ctx: BotContext): Promise<void> {
  await ctx.reply(formatWelcome(), {
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
}
