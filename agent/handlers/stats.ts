/**
 * Handler para el comando /stats.
 */
import type { BotContext } from "../context";
import { getUserStats } from "../memory/kv";
import { formatStats } from "../utils/format";

export async function handleStats(ctx: BotContext): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.reply("⚠️ Could not identify user.");
    return;
  }

  const stats = await getUserStats(userId);
  await ctx.reply(formatStats(stats), {
    parse_mode: "HTML",
  });
}
