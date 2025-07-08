import { renderPrompt } from "@vscode/prompt-tsx";
import * as vscode from "vscode";
import { ChatPrompt } from "./prompt";
import { Parser, Language, Tree } from "web-tree-sitter";
import fs from "node:fs";

interface SymbolReference {
  name: string;
  location: vscode.Location;
  type: "variable" | "function" | "class" | "property" | "method";
  range: vscode.Range;
}

export class PanelParticipant {
  private readonly chatParticipant: vscode.ChatParticipant;
  private config: vscode.WorkspaceConfiguration;
  private parser: Parser | undefined;
  private language: Language | undefined;
  private symbolCache: Map<string, SymbolReference[]> = new Map();

  constructor() {
    this.chatParticipant = vscode.chat.createChatParticipant(
      "copelot.default",
      this.handleChatRequest.bind(this)
    );

    this.config = vscode.workspace.getConfiguration("requester");
    this.initTreeSitter();
    this.initRequester();

    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("requester")) {
        vscode.window
          .showInformationMessage(
            vscode.l10n.t("您更改了配置，重载编辑器后生效"),
            "立即重载",
            "稍后"
          )
          .then((selection) => {
            if (selection === "立即重载") {
              vscode.commands.executeCommand("workbench.action.reloadWindow");
            }
          });
      }
    });

    // 监听文件变化，更新符号缓存
    vscode.workspace.onDidChangeTextDocument((event) => {
      this.updateSymbolCache(event.document);
    });

    this.chatParticipant.titleProvider = {
      provideChatTitle(context, token) {
        const historyCount = context.history.length;
        if (historyCount > 0) {
          const lastUserRequest = context.history[historyCount - 1];
          if (lastUserRequest instanceof vscode.ChatRequestTurn2) {
            const shortPrompt = lastUserRequest.prompt.substring(0, 30);
            return `Chat with Hazi (${shortPrompt}...)`;
          }
        }
        return "Chat with Hazi";
      },
    };
  }

  async handleChatRequest(
    request: vscode.ChatRequest,
    context: vscode.ChatContext,
    response: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<void> {
    let toolCallParts: vscode.LanguageModelToolCallPart[] = [];

    // 收集当前工作空间的符号信息
    await this.collectWorkspaceSymbols();

    for (const reference of request.references) {
      if (reference.value instanceof vscode.Location) {
        const uri = reference.value.uri;
        await this.parseFileSymbols(uri);
      }
    }

    // Process tool references
    if (request.toolReferences.length > 0) {
      toolCallParts = [
        ...request.toolReferences.map((part) => {
          return new vscode.LanguageModelToolCallPart("d", part.name, {
            query: request.prompt,
          });
        }),
      ];
    }

    const runWithTool = async () => {
      const requestTool = toolCallParts.shift();

      const props = {
        history: context.history,
        userQuery: request.prompt,
        references: request.references,
        toolCallParts: [],
        toolInvocationToken: request.toolInvocationToken,
      };

      if (requestTool) {
        props.toolCallParts = [requestTool as never];
      }

      const { messages, tokenCount } = await renderPrompt(
        ChatPrompt,
        props,
        {
          modelMaxPromptTokens: 128000,
        },
        request.model
      );

      const { stream } = await request.model.sendRequest(
        messages,
        undefined,
        token
      );

      // Add file references first
      request.references.forEach((reference) => {
        if (reference.value instanceof vscode.Location) {
          response.reference2(reference.value.uri);
        }
      });

      // Process response stream with symbol detection
      for await (const part of stream) {
        if (part instanceof vscode.LanguageModelTextPart) {
          await this.processTextWithSymbolReferences(part.value, response);
        }

        if (part instanceof vscode.LanguageModelToolCallPart) {
          toolCallParts.push(part);
        }
      }

      if (toolCallParts.length > 0) {
        await runWithTool();
      }
    };

    await runWithTool();
  }

  private async initTreeSitter() {
    try {
      // 动态导入 tree-sitter 和语言包
      const { Parser, Language } = await import("web-tree-sitter");
      await Parser.init();

      this.parser = new Parser();

      const buffer = fs.readFileSync("tree-sitter/tree-sitter-typescript.wasm");
      // 根据需要加载不同语言的解析器
      const TypeScript = await Language.load(buffer);

      this.language = TypeScript; // 默认使用 TypeScript
      this.parser.setLanguage(this.language);
    } catch (error) {
      console.error("Failed to initialize tree-sitter:", error);
    }
  }

  private async parseFileSymbols(uri: vscode.Uri): Promise<void> {
    if (!this.parser || !this.language) return;

    try {
      const document = await vscode.workspace.openTextDocument(uri);
      const text = document.getText();

      const tree = this.parser.parse(text)!;
      const symbols = this.extractSymbolsFromTree(tree, document);

      // 缓存符号信息
      this.symbolCache.set(uri.toString(), symbols);
    } catch (error) {
      console.error("Error parsing file symbols:", error);
    }
  }

  private extractSymbolsFromTree(
    tree: Tree,
    document: vscode.TextDocument
  ): SymbolReference[] {
    const symbols: SymbolReference[] = [];

    const traverse = (node: any) => {
      // 提取不同类型的符号
      switch (node.type) {
        case "variable_declarator":
          this.extractVariableSymbol(node, document, symbols);
          break;
        case "function_declaration":
        case "method_definition":
          this.extractFunctionSymbol(node, document, symbols);
          break;
        case "class_declaration":
          this.extractClassSymbol(node, document, symbols);
          break;
        case "property_identifier":
          this.extractPropertySymbol(node, document, symbols);
          break;
      }

      // 递归遍历子节点
      for (let i = 0; i < node.childCount; i++) {
        traverse(node.child(i)!);
      }
    };

    traverse(tree.rootNode);
    return symbols;
  }

  private extractVariableSymbol(
    node: any,
    document: vscode.TextDocument,
    symbols: SymbolReference[]
  ) {
    const nameNode = node.childForFieldName("name");
    if (nameNode) {
      const name = nameNode.text;
      const range = new vscode.Range(
        document.positionAt(nameNode.startIndex),
        document.positionAt(nameNode.endIndex)
      );

      symbols.push({
        name,
        location: new vscode.Location(document.uri, range),
        type: "variable",
        range,
      });
    }
  }

  private extractFunctionSymbol(
    node: any,
    document: vscode.TextDocument,
    symbols: SymbolReference[]
  ) {
    const nameNode = node.childForFieldName("name");
    if (nameNode) {
      const name = nameNode.text;
      const range = new vscode.Range(
        document.positionAt(nameNode.startIndex),
        document.positionAt(nameNode.endIndex)
      );

      symbols.push({
        name,
        location: new vscode.Location(document.uri, range),
        type: node.type === "method_definition" ? "method" : "function",
        range,
      });
    }
  }

  private extractClassSymbol(
    node: any,
    document: vscode.TextDocument,
    symbols: SymbolReference[]
  ) {
    const nameNode = node.childForFieldName("name");
    if (nameNode) {
      const name = nameNode.text;
      const range = new vscode.Range(
        document.positionAt(nameNode.startIndex),
        document.positionAt(nameNode.endIndex)
      );

      symbols.push({
        name,
        location: new vscode.Location(document.uri, range),
        type: "class",
        range,
      });
    }
  }

  private extractPropertySymbol(
    node: any,
    document: vscode.TextDocument,
    symbols: SymbolReference[]
  ) {
    const name = node.text;
    const range = new vscode.Range(
      document.positionAt(node.startIndex),
      document.positionAt(node.endIndex)
    );

    symbols.push({
      name,
      location: new vscode.Location(document.uri, range),
      type: "property",
      range,
    });
  }

  private async collectWorkspaceSymbols(): Promise<void> {
    // 获取工作空间中的所有相关文件
    const files = await vscode.workspace.findFiles(
      "**/*.{ts,js,tsx,jsx}",
      "**/node_modules/**"
    );

    // 解析每个文件的符号
    for (const file of files.slice(0, 50)) {
      // 限制文件数量避免性能问题
      await this.parseFileSymbols(file);
    }
  }

  private async processTextWithSymbolReferences(
    text: string,
    response: vscode.ChatResponseStream
  ): Promise<void> {
    let processedText = text;
    const allSymbols: SymbolReference[] = [];

    // 收集所有符号
    for (const symbols of this.symbolCache.values()) {
      allSymbols.push(...symbols);
    }

    // 按名称长度排序，优先匹配较长的符号名
    allSymbols.sort((a, b) => b.name.length - a.name.length);

    // 用于跟踪已经处理过的位置，避免重复替换
    const processedRanges: Array<{ start: number; end: number }> = [];

    allSymbols.forEach((symbol) => {
      // 使用词边界正则表达式匹配符号名
      const regex = new RegExp(`\\b${this.escapeRegExp(symbol.name)}\\b`, "g");
      let match;

      while ((match = regex.exec(text)) !== null) {
        const start = match.index;
        const end = start + match[0].length;

        // 检查是否与已处理的范围重叠
        const isOverlapping = processedRanges.some(
          (range) =>
            (start >= range.start && start < range.end) ||
            (end > range.start && end <= range.end)
        );

        if (!isOverlapping) {
          // 添加引用
          response.reference(symbol.location);
          processedRanges.push({ start, end });
        }
      }
    });

    // 创建可点击的符号引用
    processedText = this.addClickableReferences(text, allSymbols);
    response.markdown(processedText);
  }

  private addClickableReferences(
    text: string,
    symbols: SymbolReference[]
  ): string {
    let result = text;

    symbols.forEach((symbol) => {
      const regex = new RegExp(`\\b${this.escapeRegExp(symbol.name)}\\b`, "g");
      result = result.replace(regex, (match) => {
        // 创建 VSCode 命令链接用于跳转
        const commandUri = vscode.Uri.parse(
          `command:vscode.open?${encodeURIComponent(
            JSON.stringify([symbol.location.uri, { selection: symbol.range }])
          )}`
        );

        return `[${match}](${commandUri})`;
      });
    });

    return result;
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private updateSymbolCache(document: vscode.TextDocument): void {
    // 当文件内容改变时，重新解析符号
    this.parseFileSymbols(document.uri);
  }

  dispose() {
    this.chatParticipant.dispose();
    this.symbolCache.clear();
  }

  private initRequester() {
    this.chatParticipant.requester = {
      name: this.config.get("name") || "不知道",
      icon: vscode.Uri.parse(this.config.get("icon") || ""),
    };
  }
}
