import { GoogleGenAI } from "@google/genai";
import * as vscode from "vscode";

export class GeminiModelChatProvider
  implements vscode.LanguageModelChatProvider
{
  #client: GoogleGenAI;
  #model: string;

  constructor(apiKey: string, model: string) {
    this.#client = new GoogleGenAI({
      apiKey,
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
    const response = await this.#client.models.generateContentStream({
      model: this.#model,
      contents: [],
    });

    for await (const chunk of response) {
      console.log(chunk.text);
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
