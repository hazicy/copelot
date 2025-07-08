import { renderPrompt } from "@vscode/prompt-tsx";
import * as vscode from "vscode";
import { VscodePrompt } from "./prompt";

export class VscodeParticipant {
  private readonly chatParticipant: vscode.ChatParticipant;

  constructor() {
    this.chatParticipant = vscode.chat.createChatParticipant(
      "copelot.vscode",
      this.handleChatRequest.bind(this)
    );

    this.chatParticipant.supportIssueReporting = false;
  }

  async handleChatRequest(
    request: vscode.ChatRequest,
    context: vscode.ChatContext,
    response: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<void> {
    let toolCallParts: vscode.LanguageModelToolCallPart[] = [];

    // Process tool references
    if (request.toolReferences.length > 0) {
      toolCallParts = [
        ...request.toolReferences.map((part) => {
          return new vscode.LanguageModelToolCallPart("d", part.name, {
            query: request.prompt,
          });
        }),
      ];
    }

    const runWithTool = async () => {
      const requestTool = toolCallParts.shift();

      const props = {
        history: context.history,
        userQuery: request.prompt,
        references: request.references,
        toolCallParts: [],
        toolInvocationToken: request.toolInvocationToken,
      };

      if (requestTool) {
        props.toolCallParts = [requestTool as never];
      }

      const { messages } = await renderPrompt(
        VscodePrompt,
        props,
        {
          modelMaxPromptTokens: 128000,
        },
        request.model
      );

      const { stream } = await request.model.sendRequest(
        messages,
        undefined,
        token
      );

      // Add file references first
      request.references.forEach((reference) => {
        if (reference.value instanceof vscode.Location) {
          response.reference2(reference.value.uri);
        }
      });

      // Process response stream
      for await (const part of stream) {
        if (part instanceof vscode.LanguageModelTextPart) {
          // Process text part to add variable references
          const text = part.value;
          let processedText = text;

          response.markdown(processedText);
        }

        if (part instanceof vscode.LanguageModelToolCallPart) {
          toolCallParts.push(part);
        }
      }

      if (toolCallParts.length > 0) {
        await runWithTool();
      }
    };

    await runWithTool();
  }

  dispose() {
    this.chatParticipant.dispose();
  }
}
