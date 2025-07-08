import Anthropic from "@anthropic-ai/sdk";
import * as vscode from "vscode";

export class AnthropicModelChatProvider
  implements vscode.LanguageModelChatProvider
{
  #client: Anthropic;
  #model: string;

  constructor(model: string) {
    this.#client = new Anthropic({
      apiKey: "6",
    });
    this.#model = model;
  }

  async provideLanguageModelResponse(
    messages: Array<
      vscode.LanguageModelChatMessage | vscode.LanguageModelChatMessage2
    >,
    options: vscode.LanguageModelChatRequestOptions,
    extensionId: string,
    progress: vscode.Progress<vscode.ChatResponseFragment2>,
    token: vscode.CancellationToken
  ) {
    const stream = await this.#client.messages.create({
      messages: [],
      model: this.#model,
      max_tokens: 1000,
      stream: true,
    });

    for await (const chunk of stream) {
    }
  }

  provideTokenCount(
    text:
      | string
      | vscode.LanguageModelChatMessage
      | vscode.LanguageModelChatMessage2,
    token: vscode.CancellationToken
  ): Thenable<number> {
    throw new Error("Method not implemented.");
  }
}
