/**
 * NLP module — Natural Language Understanding via 0G Compute.
 *
 * Usa qwen/qwen-2.5-7b-instruct en 0G Compute Network para function calling.
 * El agente envía el mensaje del usuario + tools disponibles al LLM descentralizado.
 * El LLM decide autónomamente qué tool llamar (Function Calling).
 * El código ejecuta la tool y devuelve el resultado al LLM.
 * El LLM genera la respuesta final en lenguaje natural.
 *
 * Fallback a keyword matching si 0G Compute no está disponible.
 */
import "dotenv/config";
import { chatCompletion } from "@/lib/compute";
import type { ChatMessage, ToolDefinition } from "@/lib/compute";
import { ethers } from "ethers";
import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";
import { AGENT_TOOLS } from "./tools";

// Cache del broker para no reinstanciarlo
let _broker: any = null;
async function getBroker() {
  if (!_broker) {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
    _broker = await createZGComputeNetworkBroker(wallet);
  }
  return _broker;
}

async function getLedgerBalance(): Promise<string> {
  try {
    const broker = await getBroker();
    const ledger = await broker.ledger.getLedger();
    return ethers.formatEther(ledger[1] as bigint);
  } catch {
    return "?";
  }
}

const SYSTEM_PROMPT = `You are the ChainRight Verification Agent. You verify the cryptographic provenance of AI-generated images on the 0G decentralized network.

FORMAT RULES:
- Do NOT use Markdown (no bold, no italic, no code blocks). Use plain text with emojis.
- Structure your response clearly with emoji prefixes and line breaks.
- Keep responses concise and direct.

Your capabilities:
- verify_image: Use when the user sends an image and wants to check its on-chain provenance.
- show_help: Use when the user asks what you can do or how to use you.
- show_stats: Use when the user asks about their verification statistics or history.
- chat_reply: Use for small talk, greetings, or general questions.

CRITICAL RULES:
1. If the user mentions verifying/checking/validating AND there's an image attached → call verify_image with has_image=true.
2. If the user mentions verifying/checking/validating but NO image → call verify_image with has_image=false and explain they need to send an image.
3. Always be warm, direct, and helpful. Premium, minimalist brand voice.`;

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

// Convert AGENT_TOOLS to OpenAI tool definitions
function toOpenAITools(): ToolDefinition[] {
  return AGENT_TOOLS.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.function.name,
      description: tool.function.description,
      parameters: tool.function.parameters as Record<string, unknown>,
    },
  }));
}

/**
 * Envía el mensaje del usuario a 0G Compute con las tools disponibles.
 * Devuelve la respuesta del LLM y/o las tool calls que decidió hacer.
 */
export async function agentThink(
  userMessage: string,
  hasImage: boolean
): Promise<{
  textResponse: string | null;
  toolCalls: ToolCall[];
}> {
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: hasImage
        ? `[User sent an image] ${userMessage || "(no caption)"}`
        : userMessage || "(empty message)",
    },
  ];

  try {
    const result = await chatCompletion(messages, toOpenAITools());

    if (!result.success) {
      console.error(`⚠️ 0G Compute FAILED: ${result.error}`);
      console.log("   → Using keyword fallback");
      return fallbackAgent(userMessage, hasImage);
    }

    // Mostrar cost si hay ZG-Res-Key
    if (result.zkResKey) {
      console.log(`   🆔 ChatID: ${result.zkResKey.substring(0, 8)}...`);
      console.log(`   🏛️ Provider: ${result.providerAddress.substring(0, 10)}...`);
      console.log(`   🤖 Model: ${result.model}`);
    }

    // Si hay tool calls → el agente decidió ejecutar herramientas
    if (result.toolCalls.length > 0) {
      console.log(`✅ 0G Compute decided tool: ${result.toolCalls[0].name}`);
      return {
        textResponse: null,
        toolCalls: result.toolCalls,
      };
    }

    // Si no hay tool calls, es una respuesta directa de texto
    console.log("✅ 0G Compute responded with text (no tools)");
    return {
      textResponse: result.content || "I'm here to verify images! Send me a photo. 🔍",
      toolCalls: [],
    };
  } catch (error) {
    console.error("⚠️ 0G Compute exception:", error);
    console.log("   → Using keyword fallback");
    return fallbackAgent(userMessage, hasImage);
  }
}

/**
 * Envía el resultado de una tool de vuelta a 0G Compute
 * para que genere la respuesta final al usuario.
 */
export async function agentRespond(
  userMessage: string,
  toolCall: ToolCall,
  toolResult: string
): Promise<string> {
  const messages: ChatMessage[] = [
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
    const result = await chatCompletion(messages, undefined);

    if (!result.success) {
      console.error(`⚠️ 0G Compute respond FAILED: ${result.error}`);
      console.log("   → Using raw tool result (no NLP)");
      return toolResult;
    }

    console.log(`   🆔 ChatID: ${result.zkResKey.substring(0, 8)}...`);
    console.log(`   🏛️ Provider: ${result.providerAddress.substring(0, 10)}...`);
    console.log(`   🤖 Model: ${result.model}`);
    console.log(`   ✅ 0G Compute generated final response`);
    return result.content || toolResult;
  } catch (err) {
    console.error("⚠️ 0G Compute respond exception:", err);
    return toolResult;
  }
}

/**
 * Fallback determinístico cuando 0G Compute no está disponible.
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
