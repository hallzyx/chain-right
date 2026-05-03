/**
 * NLP module — Natural Language Understanding via DeepSeek API.
 *
 * El agente envía el mensaje del usuario + tools disponibles a DeepSeek.
 * DeepSeek decide autónomamente qué tool llamar (Function Calling).
 * El código ejecuta la tool y devuelve el resultado a DeepSeek.
 * DeepSeek genera la respuesta final en lenguaje natural.
 */
import "dotenv/config";
import { AGENT_TOOLS } from "./tools";
import type { ToolDefinition } from "./tools";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";

const SYSTEM_PROMPT = `You are the ChainRight Verification Agent. You verify the cryptographic provenance of AI-generated images on the 0G decentralized network.

FORMAT RULES:
- Do NOT use Markdown (no bold, no italic, no code blocks). Use plain text with emojis.
- Structure your response clearly with emoji prefixes and line breaks.
- Keep responses concise and direct.

Your capabilities:
- **verify_image**: Use when the user sends an image and wants to check its on-chain provenance.
- **show_help**: Use when the user asks what you can do or how to use you.
- **show_stats**: Use when the user asks about their verification statistics or history.
- **chat_reply**: Use for small talk, greetings, or general questions.

CRITICAL RULES:
1. If the user mentions verifying/checking/validating AND there's an image attached → call verify_image with has_image=true.
2. If the user mentions verifying/checking/validating but NO image → call verify_image with has_image=false and explain they need to send an image.
3. Always be warm, direct, and helpful. Premium, minimalist brand voice.`;

interface DeepSeekMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
}

interface DeepSeekResponse {
  choices: {
    message: {
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }>;
    };
    finish_reason: string;
  }[];
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * Envía el mensaje del usuario a DeepSeek con las tools disponibles.
 * Devuelve la respuesta del LLM y/o las tool calls que decidió hacer.
 */
export async function agentThink(
  userMessage: string,
  hasImage: boolean
): Promise<{
  textResponse: string | null;
  toolCalls: ToolCall[];
}> {
  if (!DEEPSEEK_API_KEY) {
    // Sin API key: fallback determinístico
    return fallbackAgent(userMessage, hasImage);
  }

  const messages: DeepSeekMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: hasImage
        ? `[User sent an image] ${userMessage || "(no caption)"}`
        : userMessage || "(empty message)",
    },
  ];

  try {
    const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages,
        tools: AGENT_TOOLS,
        tool_choice: "auto",
        max_tokens: 200,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error(`DeepSeek agent error: ${response.status}`);
      return fallbackAgent(userMessage, hasImage);
    }

    const data: DeepSeekResponse = await response.json();
    const choice = data.choices?.[0];
    if (!choice) return fallbackAgent(userMessage, hasImage);

    const msg = choice.message;

    // Si hay tool calls → el agente decidió ejecutar herramientas
    if (msg.tool_calls && msg.tool_calls.length > 0) {
      const toolCalls: ToolCall[] = msg.tool_calls.map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments || "{}"),
      }));

      return {
        textResponse: null,
        toolCalls,
      };
    }

    // Si no hay tool calls, es una respuesta directa de texto
    return {
      textResponse: msg.content || "I'm here to verify images! Send me a photo. 🔍",
      toolCalls: [],
    };
  } catch (error) {
    console.error("DeepSeek agent error:", error);
    return fallbackAgent(userMessage, hasImage);
  }
}

/**
 * Envía el resultado de una tool de vuelta a DeepSeek
 * para que genere la respuesta final al usuario.
 */
export async function agentRespond(
  userMessage: string,
  toolCall: ToolCall,
  toolResult: string
): Promise<string> {
  if (!DEEPSEEK_API_KEY) {
    return toolResult;
  }

  const messages: DeepSeekMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `[User sent an image] ${userMessage || "(no caption)"}`,
    },
    {
      role: "assistant",
      content: "",
      tool_calls: [
        {
          id: toolCall.id,
          type: "function",
          function: {
            name: toolCall.name,
            arguments: JSON.stringify(toolCall.arguments),
          },
        },
      ],
    },
    {
      role: "tool",
      content: toolResult,
      tool_call_id: toolCall.id,
    },
  ];

  try {
    const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages,
        max_tokens: 300,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      return toolResult;
    }

    const data: DeepSeekResponse = await response.json();
    return data.choices?.[0]?.message?.content || toolResult;
  } catch {
    return toolResult;
  }
}

/**
 * Fallback determinístico cuando DeepSeek no está disponible.
 * Usa keywords para decidir la acción.
 */
function fallbackAgent(
  userMessage: string,
  hasImage: boolean
): {
  textResponse: string | null;
  toolCalls: ToolCall[];
} {
  const lower = userMessage.toLowerCase();

  // Verify
  const verifyWords = [
    "verify", "check", "validate", "authenticate", "prove",
    "real?", "legit?", "authentic?", "confirm",
    "verifica", "verificar", "valida", "autentica",
  ];

  const helpWords = [
    "help", "ayuda", "what can you", "how to", "how do",
    "commands", "comandos", "que haces", "qué haces",
  ];

  const statsWords = [
    "stats", "statistics", "history", "how many",
    "estadisticas", "cuantas", "cuántas", "historial",
  ];

  if (hasImage || verifyWords.some((w) => lower.includes(w))) {
    return {
      textResponse: null,
      toolCalls: [
        {
          id: "fallback-1",
          name: "verify_image",
          arguments: { user_message: userMessage, has_image: hasImage },
        },
      ],
    };
  }

  if (helpWords.some((w) => lower.includes(w))) {
    return {
      textResponse: null,
      toolCalls: [
        {
          id: "fallback-2",
          name: "show_help",
          arguments: { topic: "general" },
        },
      ],
    };
  }

  if (statsWords.some((w) => lower.includes(w))) {
    return {
      textResponse: null,
      toolCalls: [{ id: "fallback-3", name: "show_stats", arguments: {} }],
    };
  }

  if (hasImage) {
    return {
      textResponse: null,
      toolCalls: [
        {
          id: "fallback-4",
          name: "verify_image",
          arguments: { user_message: userMessage, has_image: true },
        },
      ],
    };
  }

  return {
    textResponse: null,
    toolCalls: [
      {
        id: "fallback-5",
        name: "chat_reply",
        arguments: { message: userMessage },
      },
    ],
  };
}
