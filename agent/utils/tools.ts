/**
 * Agente Tools — definición de herramientas para Function Calling.
 *
 * El LLM (DeepSeek) decide autónomamente qué tool invocar
 * basándose en el mensaje del usuario y el contexto.
 *
 * Tools disponibles:
 *  - verify_image: verifica la procedencia on-chain de una imagen
 *  - show_help: muestra información de ayuda
 *  - show_stats: muestra estadísticas de verificación del usuario
 *
 * Formato compatible con OpenAI Function Calling (DeepSeek lo soporta).
 */

/** Definición de tool en formato OpenAI/DeepSeek */
interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export const AGENT_TOOLS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "verify_image",
      description:
        "Verify the on-chain provenance of an image. Use this when the user sends a photo or document and wants to check if it's authentic on the 0G blockchain. Also use this when the user asks to verify, validate, check, or confirm authenticity of an artwork.",
      parameters: {
        type: "object",
        properties: {
          user_message: {
            type: "string",
            description:
              "What the user said about this image. Use this to understand if they have specific concerns or questions.",
          },
          has_image: {
            type: "boolean",
            description:
              "Whether the user attached an image or document to verify. If false, ask the user to send an image.",
          },
        },
        required: ["user_message", "has_image"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "show_help",
      description:
        "Show help information about the agent. Use this when the user asks what you can do, how to use you, what commands are available, or what features you have.",
      parameters: {
        type: "object",
        properties: {
          topic: {
            type: "string",
            description:
              "What aspect the user wants help with: 'general', 'verification', 'how_to_send', or 'commands'.",
            enum: ["general", "verification", "how_to_send", "commands"],
          },
        },
        required: ["topic"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "show_stats",
      description:
        "Show the user's verification statistics. Use this when the user asks about their stats, history, how many times they've verified, or their activity.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "chat_reply",
      description:
        "Reply to the user's general message, question, or greeting. Use this when the user is just chatting, saying hello, asking about the project, or anything that doesn't require an action. Keep replies friendly, short, and helpful.",
      parameters: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description:
              "What the user said that doesn't require a specific action.",
          },
        },
        required: ["message"],
      },
    },
  },
];

/** Resultado que devuelve la ejecución de una tool */
export interface ToolResult {
  toolName: string;
  content: string; // texto para enviar de vuelta al LLM
  metadata?: Record<string, unknown>; // datos adicionales
  /** Si la tool necesita hacer algo en el chat (ej. enviar un PDF) */
  sideEffect?: {
    type: "send_pdf" | "reply_text" | "none";
    data?: unknown;
  };
}
