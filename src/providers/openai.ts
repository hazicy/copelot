import OpenAI from "openai";
import * as vscode from "vscode";
import { convertMessagesToOpenAI } from "../utils/convert-messages";
import { Tiktoken, getEncoding } from "js-tiktoken";

export class OpenAICompatibleModelChatProvider
  implements vscode.LanguageModelChatProvider
{
  #client: OpenAI;
  #model: string;
  eventEmitter = new vscode.EventEmitter<{
    readonly extensionId: string;
    readonly participant?: string;
    readonly tokenCount?: number;
  }>();

  constructor(baseURL: string, apiKey: string, model: string) {
    this.#client = new OpenAI({
      baseURL,
      apiKey,
    });
    this.#model = model;
  }

  async provideLanguageModelResponse(
    messages: vscode.LanguageModelChatMessage[],
    options: vscode.LanguageModelChatRequestOptions,
    _extensionId: string,
    progress: vscode.Progress<vscode.ChatResponseFragment2>,
    token: vscode.CancellationToken
  ) {
    const abortController = new AbortController();
    token.onCancellationRequested(() => {
      abortController.abort();
    });

    const stream = await this.#client.chat.completions.create({
      model: this.#model,
      messages: convertMessagesToOpenAI(messages),
      n: 1,
      stream: true,
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta.content;
      if (text) {
        progress.report({
          index: 0,
          part: new vscode.LanguageModelTextPart(text),
        });
      }

      const toolCalls = chunk.choices[0]?.delta.tool_calls;
      if (toolCalls && toolCalls.length > 0) {
        toolCalls.forEach((toolCall) => {
          progress.report({
            index: 1,
            part: new vscode.LanguageModelToolCallPart(
              toolCall.id!,
              toolCall.function?.name!,
              JSON.parse(toolCall.function?.arguments!)
            ),
          });
        });
      }
    }
  }

  /**
   * 输入 token 计数，但不知道返回的数据是向哪提供了
   */
  async provideTokenCount(
    text:
      | string
      | vscode.LanguageModelChatMessage
      | vscode.LanguageModelChatMessage2,
    token: vscode.CancellationToken
  ) {
    let content = "";

    if (typeof text === "string") {
      content = text;
    } else if (
      text instanceof vscode.LanguageModelChatMessage ||
      text instanceof vscode.LanguageModelChatMessage2
    ) {
      content = text.content
        .map((part) => {
          if (part instanceof vscode.LanguageModelTextPart) {
            return part.value;
          }
          return "";
        })
        .join("");
    }

    const tokenizer = getEncoding("cl100k_base");
    const tokens = tokenizer.encode(content.normalize("NFKC"), "all").length;

    return tokens;
  }

  onDidReceiveLanguageModelResponse2 = this.eventEmitter.event;
}
