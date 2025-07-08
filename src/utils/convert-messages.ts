import type { ChatCompletionMessageParam } from "openai/resources.mjs";
import * as vscode from "vscode";

export function convertMessagesToOpenAI(
  messages: vscode.LanguageModelChatMessage[]
): ChatCompletionMessageParam[] {
  const openAIMessages: ChatCompletionMessageParam[] = [];

  for (const message of messages) {
    if (message.role === vscode.LanguageModelChatMessageRole.System) {
      const content = message.content
        .map((chunk) =>
          chunk instanceof vscode.LanguageModelTextPart ? chunk.value : ""
        )
        .join("");

      openAIMessages.push({
        role: "system",
        content,
      });
    }

    if (message.role === vscode.LanguageModelChatMessageRole.User) {
      const content = message.content
        .map((chunk) =>
          chunk instanceof vscode.LanguageModelTextPart ? chunk.value : ""
        )
        .join("");

      openAIMessages.push({
        role: "user",
        content,
      });
    }

    if (message.role === vscode.LanguageModelChatMessageRole.Assistant) {
      const content = message.content
        .map((chunk) =>
          chunk instanceof vscode.LanguageModelTextPart ? chunk.value : ""
        )
        .join("");

      openAIMessages.push({
        role: "assistant",
        content,
      });
    }
  }

  return openAIMessages;
}
