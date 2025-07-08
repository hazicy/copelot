import * as vscode from "vscode";
import OpenAI from "openai";
import { CompletionFormatter } from "./formatter";
import { LRUCache } from "./lru";
import AsyncLock from "async-lock";
import { getPrefixSuffix, getStopSequences } from "./utils";
import { getFimPrompt } from "./fim-template";
import { supportedLanguages } from "../../common/languages";

export interface PrefixSuffix {
  prefix: string;
  suffix: string;
}

class InlineCompletionItemProvider
  implements vscode.InlineCompletionItemProvider
{
  public debounceDelayMs: number | undefined = 300;

  private client: OpenAI | null = null;
  private debounceTimer: NodeJS.Timeout | undefined;
  private pendingRequest: AbortController | undefined;
  private formatter: CompletionFormatter | undefined;
  private cache: LRUCache;
  private lock: AsyncLock;
  private prefixSuffix: PrefixSuffix | undefined;
  private lastCompletionText: string | undefined;
  private config: vscode.WorkspaceConfiguration | undefined;
  private model: string = "";

  constructor() {
    this.cache = new LRUCache(200);
    this.lock = new AsyncLock();
    this.config = vscode.workspace.getConfiguration("inlineCompletion");

    this.loadConfig();
    this.setupConfigWatcher();
  }

  private setupConfigWatcher() {
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("inlineCompletion")) {
        this.loadConfig();
      }

      // Show notification for major changes
      if (
        event.affectsConfiguration("inlineCompletion.apiKey") ||
        event.affectsConfiguration("inlineCompletion.baseURL")
      ) {
        vscode.window.showInformationMessage(
          "Inline Completion: Configuration updated"
        );
      }
    });
  }

  private loadConfig() {
    const config = vscode.workspace.getConfiguration("inlineCompletion");
    const apiKey = config.get<string>("apiKey");
    const baseURL = config.get<string>("baseURL");
    const model = config.get<string>("model");

    this.model = model || "";

    // Validate API key
    if (!config.apiKey || config.apiKey.trim() === "") {
      vscode.window.showWarningMessage(
        "Inline Completion: API key is not configured. Please set inlineCompletion.apiKey in settings."
      );
    }

    this.client = new OpenAI({
      apiKey,
      baseURL,
    });
  }

  provideInlineCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.InlineCompletionContext,
    token: vscode.CancellationToken
  ): Promise<vscode.InlineCompletionItem[] | undefined> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    const editor = vscode.window.activeTextEditor;
    // 没有活跃编辑器，直接返回
    if (!editor) {
      return Promise.resolve(undefined);
    }

    this.formatter = new CompletionFormatter(editor);

    return new Promise((resolve, reject) => {
      this.debounceTimer = setTimeout(async () => {
        if (token.isCancellationRequested) {
          resolve(undefined);
          return;
        }

        this.pendingRequest = new AbortController();
        const signal = this.pendingRequest.signal;

        const response = await this.lock.acquire<OpenAI.Completions.Completion>(
          "copelot.completion",
          () => {
            return new Promise(async (resolve, reject) => {
              try {
                if (!this.client) {
                  throw new Error("OpenAI 客户端未初始化");
                }

                const prefixSuffix = getPrefixSuffix(document, position);
                this.prefixSuffix = prefixSuffix;

                const prompt = getFimPrompt("codeqwen", "automatic", {
                  context: "",
                  fileContextEnabled: false,
                  header: this.getPromptHeader(
                    document.languageId,
                    document.uri
                  ),
                  prefixSuffix: this.prefixSuffix,
                  language: "javscript",
                });

                const res = await this.client.completions.create(
                  {
                    model: this.model,
                    prompt,
                    max_tokens: this.config?.get("maxTokens"),
                    temperature: this.config?.get("temperature"),
                    n: 1,
                    stop: [...(getStopSequences("codeqwen") || [])],
                  },
                  {
                    signal,
                  }
                );
                resolve(res);
              } catch (error) {
                console.error(error);
                reject(error);
              }
            });
          }
        );

        if (!response.choices || response.choices.length === 0) {
          return undefined;
        }

        // 处理并返回补全项
        const items = response.choices
          .filter((choice) => choice.text && choice.text.length > 0)
          .map((choice) => {
            let completionText = choice.text || "";

            const inlineCompletionItem = new vscode.InlineCompletionItem(
              this.formatter?.format(completionText)!,
              new vscode.Range(position, position)
            );

            return inlineCompletionItem;
          });

        resolve(items);
      }, this.debounceDelayMs);

      // 处理取消请求的情况
      token.onCancellationRequested(() => {
        if (this.debounceTimer) {
          clearTimeout(this.debounceTimer);
          this.debounceTimer = undefined;
        }

        if (this.pendingRequest) {
          this.pendingRequest.abort();
          this.pendingRequest = undefined;
        }
        resolve(undefined);
      });
    });
  }

  private getPromptHeader(languageId: string | undefined, uri: vscode.Uri) {
    const lang =
      supportedLanguages[languageId as keyof typeof supportedLanguages];

    if (!lang) {
      return "";
    }

    const language = `${lang.syntaxComments?.start || ""} Language: ${
      lang?.langName
    } (${languageId}) ${lang.syntaxComments?.end || ""}`;

    const path = `${
      lang.syntaxComments?.start || ""
    } File uri: ${uri.toString()} (${languageId}) ${
      lang.syntaxComments?.end || ""
    }`;

    return `\n${language}\n${path}\n`;
  }
}

export function registerInlineCompletion() {
  vscode.languages.registerInlineCompletionItemProvider(
    {
      pattern: "**/*.{ts,js,tsx,jsx,py,go,java,c,cpp,rs}",
    },
    new InlineCompletionItemProvider()
  );
}
