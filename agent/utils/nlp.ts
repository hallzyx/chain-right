/**
 * NLP module — Natural Language Understanding via DeepSeek API.
 * Clasifica la intención del usuario para el agente de ChainRight.
 *
 * Usa deepseek-chat (modelo económico, suficiente para clasificación).
 */
import "dotenv/config";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";

const SYSTEM_PROMPT = `You are the ChainRight Verification Agent intent classifier. Your ONLY job is to classify user messages into intents.

Classify into EXACTLY one of these intents:
- "verify" — user wants to verify, check, validate, or confirm an image's authenticity or provenance on the blockchain
- "help" — user asks what you can do, how to use you, or about your capabilities
- "stats" — user asks about their verification statistics, history, or how many times they've used you
- "unknown" — anything that doesn't fit the above (greetings, small talk, unrelated questions)

Reply with ONLY the lowercase intent word. No punctuation, no explanation.`;

export type Intent = "verify" | "help" | "stats" | "unknown";

interface DeepSeekResponse {
  choices: { message: { content: string } }[];
}

/**
 * Detecta la intención de un mensaje usando DeepSeek.
 * Si la API no está disponible, usa keyword matching como fallback.
 */
export async function detectIntent(message: string): Promise<Intent> {
  // Si no hay API key, usar keyword fallback
  if (!DEEPSEEK_API_KEY) {
    return keywordFallback(message);
  }

  try {
    const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: message },
        ],
        max_tokens: 10,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      console.error(`DeepSeek API error: ${response.status}`);
      return keywordFallback(message);
    }

    const data: DeepSeekResponse = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim().toLowerCase() || "";

    // Validar que sea una intención conocida
    if (["verify", "help", "stats"].includes(raw)) {
      return raw as Intent;
    }

    return "unknown";
  } catch (error) {
    console.error("DeepSeek NLP error:", error);
    return keywordFallback(message);
  }
}

/**
 * Fallback basado en keywords cuando DeepSeek no está disponible.
 */
function keywordFallback(message: string): Intent {
  const lower = message.toLowerCase();

  // Verificar
  const verifyWords = [
    "verify", "check", "validate", "authenticate", "prove",
    "real?", "legit?", "authentic?", "confirm",
    "verifica", "verificar", "valida", "autentica",
  ];
  if (verifyWords.some((w) => lower.includes(w))) return "verify";

  // Ayuda
  const helpWords = [
    "help", "ayuda", "what can you", "how to", "how do",
    "commands", "comandos", "que haces", "qué haces",
  ];
  if (helpWords.some((w) => lower.includes(w))) return "help";

  // Stats
  const statsWords = [
    "stats", "statistics", "history", "how many",
    "estadisticas", "cuantas", "cuántas", "historial",
  ];
  if (statsWords.some((w) => lower.includes(w))) return "stats";

  return "unknown";
}

/**
 * Genera una respuesta conversacional usando DeepSeek.
 * Solo para mensajes que no son verify/help/stats (ej. small talk, preguntas).
 */
export async function chatResponse(message: string): Promise<string> {
  if (!DEEPSEEK_API_KEY) {
    return "I'm the ChainRight Verification Agent. Send me an image to verify its blockchain provenance, or type /help for commands.";
  }

  try {
    const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: `You are the ChainRight Verification Agent. You verify provenance of AI-generated images on the 0G blockchain.

You can:
• Verify images — send me any image and I'll check its on-chain provenance
• Show stats — ask for your verification history
• Help — ask what I can do

Keep responses SHORT (1-2 sentences). Be helpful and friendly. Don't make up features. If asked something unrelated to image verification, politely redirect to your capabilities.

You are part of the ChainRight ecosystem: 0G Storage + 0G Compute + 0G Chain.`,
          },
          { role: "user", content: message },
        ],
        max_tokens: 120,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      return "I'm here to verify images! Send me a photo and I'll check its on-chain provenance.";
    }

    const data: DeepSeekResponse = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || "Send me an image and I'll verify it! 🔍";
  } catch {
    return "Send me an image and I'll verify its provenance on the 0G blockchain. Type /help for more.";
  }
}
