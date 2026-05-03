/**
 * Handler para el comando /help.
 */
import type { BotContext } from "../context";
import { formatHelp } from "../utils/format";

export async function handleHelp(ctx: BotContext): Promise<void> {
  await ctx.reply(formatHelp(), {
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
}
