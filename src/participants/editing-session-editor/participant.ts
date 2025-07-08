import { renderPrompt } from "@vscode/prompt-tsx";
import * as vscode from "vscode";
import { EditorPrompt } from "./prompt";

export class EditingSessionEditorParticipant {
  private chatParticipant: vscode.ChatParticipant;
  private static CHAT_PARTICIPANT_ID = "copelot.editingSessionEditor";

  constructor() {
    this.chatParticipant = vscode.chat.createChatParticipant(
      EditingSessionEditorParticipant.CHAT_PARTICIPANT_ID,
      this.handleChatRequest.bind(this)
    );
  }

  async handleChatRequest(
    request: vscode.ChatRequest,
    context: vscode.ChatContext,
    response: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<void> {
    response.progress(vscode.l10n.t("准备你的请求..."));

    const editor = vscode.window.activeTextEditor;

    // 获取活动编辑器
    if (!editor) {
      response.markdown(
        vscode.l10n.t("未找到活动文本编辑器。请打开一个文件并重试。")
      );
      return;
    }

    // 获取 prompt
    const userPrompt = request.prompt;

    if (!userPrompt) {
      response.markdown(vscode.l10n.t("没有获取到 prompt"));
      return;
    }

    // 获取当前选择内容
    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);
    const selectedRange = new vscode.Range(
      editor.selection.start,
      editor.selection.end
    );
    const prefixSpaces = (selectedText.match(/^\s*/) || [""])[0];

    const { messages } = await renderPrompt(
      EditorPrompt,
      {
        userQuery: request.prompt,
        selectedText,
        history: context.history,
        languageId: editor.document.languageId,
      },
      {
        modelMaxPromptTokens: 128000,
      },
      request.model
    );

    try {
      const { stream } = await request.model.sendRequest(messages, {}, token);

      let currentText = "",
        appliedLineOffset = 0,
        codeContent = "",
        isCollectingCode = false;

      for await (const part of stream) {
        if (part instanceof vscode.LanguageModelTextPart) {
          currentText += part.value;

          const currentLines = currentText.split("\n");
          const completeLines = currentLines.slice(0, -1);
          currentText = currentLines[currentLines.length - 1];

          let textEdit = [];

          for (const line of completeLines) {
            const titleMatch = line.match(/^###\s+(.+)$/);
            if (titleMatch) {
              const title = titleMatch[1];
              response.markdown(title);

              response.markdown("\n\n```\n");
              response.codeblockUri(editor.document.uri, true);
              response.markdown("\n```\n\n");
              continue;
            }

            if (line.startsWith("````") && !isCollectingCode) {
              isCollectingCode = true;
              continue;
            }

            if (line.startsWith("````") && isCollectingCode) {
              isCollectingCode = false;
              continue;
            }

            if (!isCollectingCode) {
              continue;
            }

            // 创建当前行的起始位置
            const lineStartPos = selectedRange.start.translate(
              appliedLineOffset,
              0
            );
            // 创建行的结束位置
            const lineEndPos = lineStartPos.translate(
              0,
              Number.MAX_SAFE_INTEGER
            );
            // 创建 range
            const range = new vscode.Range(lineStartPos, lineEndPos);

            if (lineStartPos.line > editor.selection.end.line) {
              textEdit.push(
                vscode.TextEdit.insert(lineStartPos, prefixSpaces + line + "\n")
              );
            } else {
              textEdit.push(
                vscode.TextEdit.replace(range, prefixSpaces + line)
              );
            }

            appliedLineOffset++;
          }

          response.textEdit(editor.document.uri, textEdit);
        }
      }

      if (currentText.length > 0 && !currentText.includes("```")) {
        response.textEdit(editor.document.uri, [
          new vscode.TextEdit(
            new vscode.Range(
              selectedRange.start.translate(appliedLineOffset, 0),
              selectedRange.start.translate(
                appliedLineOffset,
                Number.MAX_SAFE_INTEGER
              )
            ),
            prefixSpaces + currentText + "\n"
          ),
        ]);
      }

      if (
        selectedRange.start.line + appliedLineOffset <
        selectedRange.end.line
      ) {
        const textEdit = vscode.TextEdit.delete(
          new vscode.Range(
            new vscode.Position(
              selectedRange.start.line + appliedLineOffset,
              Number.MAX_SAFE_INTEGER
            ),
            selectedRange.end
          )
        );

        response.textEdit(editor.document.uri, textEdit);
      }
    } catch (error) {
      // 记录错误日志，方便调试
      console.error("Error occurred during handling chat request:", error);
      response.markdown(
        vscode.l10n.t(
          "An error occurred while processing your request. Please try again later."
        )
      );
    }
  }

  dispose() {
    if (this.chatParticipant) {
      this.chatParticipant.dispose();
    }
  }
}
