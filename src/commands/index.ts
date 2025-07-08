import * as vscode from "vscode";
import { generateCommitMessage } from "./generate-commit-message";
import { chatExplain } from "./chat-explain";
import { chatFix } from "./chat-fix";

export function registerCommands() {
  vscode.commands.registerCommand(
    "copelot.git.generateCommitMessage",
    generateCommitMessage
  );
  vscode.commands.registerCommand("copelot.chatExplain", chatExplain);

  vscode.commands.registerCommand("copelot.chatFix", chatFix);
}