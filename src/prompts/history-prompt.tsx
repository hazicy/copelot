import {
  PromptElement,
  AssistantMessage,
  type PromptPiece,
  type BasePromptElementProps,
  UserMessage,
  PrioritizedList,
} from "@vscode/prompt-tsx";
import * as vscode from "vscode";

interface IHistoryMessagesProps extends BasePromptElementProps {
  history: vscode.ChatContext["history"];
}

export class HistoryPrompt extends PromptElement<IHistoryMessagesProps> {
  render(): PromptPiece {
    const history: (UserMessage | AssistantMessage)[] = [];
    for (const turn of this.props.history) {
      if (turn instanceof vscode.ChatRequestTurn) {
        history.push(<UserMessage>{turn.prompt}</UserMessage>);
      } else if (turn instanceof vscode.ChatResponseTurn) {
        history.push(
          <AssistantMessage name={turn.participant}>
            {chatResponseToMarkdown(turn)}
          </AssistantMessage>
        );
      }
    }
    return (
      <PrioritizedList priority={0} descending={false}>
        {history}
      </PrioritizedList>
    );
  }
}

const chatResponseToMarkdown = (response: vscode.ChatResponseTurn) => {
  let str = "";

  for (const part of response.response) {
    if (part instanceof vscode.ChatResponseMarkdownPart) {
      str += part.value.value;
    }
  }

  return str;
};
