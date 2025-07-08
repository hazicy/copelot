import {
  BasePromptElementProps,
  PromptElement,
  UserMessage,
} from "@vscode/prompt-tsx";
import * as vscode from "vscode";
import { HistoryPrompt } from "../../prompts/history-prompt";

interface ChatPromptProps extends BasePromptElementProps {
  userQuery: string;
  selectedText: string;
  history: vscode.ChatContext["history"];
  languageId: string;
}

export class EditorPrompt extends PromptElement<ChatPromptProps> {
  render() {
    return (
      <>
        <HistoryPrompt history={this.props.history}></HistoryPrompt>
        <UserMessage priority={90}>
          你是一个 VSCode
          内联聊天助手，你的任务是根据用户提供的代码和指令，输出修改或完善后的代码。
          <br />
          请严格遵守以下规则：
          <br />
          1. 输入一个简短的描述，告诉用户你将做什么。
          <br />
          2. 代码应该包含在代码块中，代码块应以四个反引号开头。
          <br />
          3. 代码应该用{this.props.languageId}编写。
          <br />
          示例输出：
          <br />
          ### 我将帮你完善代码
          <br />
          ````ts
          <br />
          // code
          <br />
          ````
          <br />
          以下是用户提供的上下文：
          <br />
          编辑器选中的文本：
          <br />
          {this.props.selectedText}
          <br />
          用户指令：
          <br />
          {this.props.userQuery}
          <br />
          请根据以上信息，直接输出修改或完善后的代码：
        </UserMessage>
      </>
    );
  }
}
