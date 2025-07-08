import { PromptElement, type PromptElementProps } from "@vscode/prompt-tsx";
import * as vscode from "vscode";

export class ToolCalls extends PromptElement<
  PromptElementProps<{
    toolCallParts: vscode.LanguageModelToolCallPart[];
    toolInvocationToken: vscode.ChatParticipantToolToken;
  }>
> {
  async render() {
    return <></>;
  }
}
