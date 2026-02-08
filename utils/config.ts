export interface AppConfig {
  skipConfirmation: boolean;
}

/**
 * Reads application configuration from environment variables.
 */
export function getConfig(): AppConfig {
  return {
    skipConfirmation: process.env.APPLE_MCP_SKIP_CONFIRMATION === "true",
  };
}

/**
 * Map of tool names to their write operation names that require confirmation.
 */
export const WRITE_OPERATIONS: Record<string, string[]> = {
  messages: ["send", "schedule"],
  mail: ["send"],
  notes: ["create"],
  reminders: ["create"],
  calendar: ["create"],
  maps: ["save", "pin", "createGuide", "addToGuide"],
};

/**
 * Checks if a given tool + operation combination requires user confirmation.
 */
export function isWriteOperation(toolName: string, operation: string): boolean {
  const ops = WRITE_OPERATIONS[toolName];
  return ops !== undefined && ops.includes(operation);
}
