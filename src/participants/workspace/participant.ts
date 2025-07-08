import * as vscode from "vscode";

export class WorkspaceParticipant {
  private readonly chatParticipant: vscode.ChatParticipant;

  constructor() {
    this.chatParticipant = vscode.chat.createChatParticipant(
      "copelot.workspace",
      this.handleChatRequest.bind(this)
    );

    this.chatParticipant.iconPath = new vscode.ThemeIcon("code");
  }

  private async handleChatRequest(
    request: vscode.ChatRequest,
    context: vscode.ChatContext,
    response: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ) {
    response.markdown("66");
  }
}
