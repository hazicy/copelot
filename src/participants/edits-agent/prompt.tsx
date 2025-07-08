import {
  BasePromptElementProps,
  PromptElement,
  UserMessage,
} from "@vscode/prompt-tsx";
import * as vscode from "vscode";
import { ToolCalls } from "../../prompts/tool-calls";
import { HistoryPrompt } from "../../prompts/history-prompt";
import { ReferencesPrompt } from "../../prompts/references-prompt";

interface ChatPromptProps extends BasePromptElementProps {
  history: vscode.ChatContext["history"];
  userQuery: string;
  references: ReadonlyArray<vscode.ChatPromptReference>;
  toolCallParts: vscode.LanguageModelToolCallPart[];
  toolInvocationToken: vscode.ChatParticipantToolToken;
}

export class EditsAgentPrompt extends PromptElement<ChatPromptProps> {
  render() {
    return (
      <>
        <HistoryPrompt history={this.props.history}></HistoryPrompt>
        <UserMessage priority={90}>
          <ReferencesPrompt
            references={this.props.references}
          ></ReferencesPrompt>
          {this.props.userQuery}
        </UserMessage>
        <ToolCalls
          toolCallParts={this.props.toolCallParts}
          toolInvocationToken={this.props.toolInvocationToken}
        ></ToolCalls>
      </>
    );
  }
}
