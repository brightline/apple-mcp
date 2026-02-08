import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { getConfig } from "./config.ts";

export interface ConfirmationResult {
  confirmed: boolean;
  message: string;
}

/**
 * Requests user confirmation before executing a write operation.
 *
 * 1. If APPLE_MCP_SKIP_CONFIRMATION=true -> auto-approve
 * 2. If client supports MCP sampling -> ask user via createMessage
 * 3. Otherwise -> return rejection with informational message
 */
export async function requestConfirmation(
  server: Server,
  description: string,
  details: string,
): Promise<ConfirmationResult> {
  const config = getConfig();

  // 1. Auto-approve if configured
  if (config.skipConfirmation) {
    return { confirmed: true, message: "Auto-approved (APPLE_MCP_SKIP_CONFIRMATION=true)" };
  }

  // 2. Try MCP sampling if client supports it
  try {
    const capabilities = server.getClientCapabilities();
    if (capabilities?.sampling) {
      const response = await server.createMessage({
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `The MCP server wants to perform the following action:\n\n**${description}**\n\n${details}\n\nDo you approve? Reply with "yes" or "no".`,
            },
          },
        ],
        maxTokens: 10,
      });

      const responseText = response.content.type === "text" ? response.content.text.toLowerCase().trim() : "";
      const approved = responseText.includes("yes") || responseText.includes("approve");

      return {
        confirmed: approved,
        message: approved
          ? "User approved the operation."
          : "User denied the operation.",
      };
    }
  } catch {
    // Sampling not available or failed, fall through to rejection
  }

  // 3. No confirmation mechanism available
  return {
    confirmed: false,
    message: `Action requires confirmation: ${description}\n\nDetails:\n${details}\n\nTo bypass confirmation, set the environment variable APPLE_MCP_SKIP_CONFIRMATION=true`,
  };
}
