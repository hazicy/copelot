import { renderPrompt } from "@vscode/prompt-tsx";
import * as vscode from "vscode";
import { EditSessionPrompt } from "./prompt";

export class EditingSessionParticipant {
  private readonly chatParticipant: vscode.ChatParticipant;

  constructor() {
    this.chatParticipant = vscode.chat.createChatParticipant(
      "copelot.editingSession",
      this.handleChatRequest.bind(this)
    );
  }

  async handleChatRequest(
    request: vscode.ChatRequest,
    context: vscode.ChatContext,
    response: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<void> {
    // 重置编辑映射

    const prompt = await renderPrompt(
      EditSessionPrompt,
      {
        history: context.history,
        userQuery: request.prompt,
        references: request.references,
      },
      {
        modelMaxPromptTokens: 4960,
      },
      request.model
    );

    const { stream } = await request.model.sendRequest(
      prompt.messages,
      {},
      token
    );
  }
}
