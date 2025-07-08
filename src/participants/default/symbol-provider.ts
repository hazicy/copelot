import * as vscode from 'vscode';

export class SymbolNavigationProvider {
  private static instance: SymbolNavigationProvider;

  private constructor() {}

  public static getInstance(): SymbolNavigationProvider {
    if (!SymbolNavigationProvider.instance) {
      SymbolNavigationProvider.instance = new SymbolNavigationProvider();
    }
    return SymbolNavigationProvider.instance;
  }

  public registerCommands(context: vscode.ExtensionContext): void {
    // 注册跳转到符号的命令
    const jumpToSymbolCommand = vscode.commands.registerCommand(
      'extension.jumpToSymbol',
      this.jumpToSymbol.bind(this)
    );

    // 注册查找符号引用的命令
    const findReferencesCommand = vscode.commands.registerCommand(
      'extension.findSymbolReferences',
      this.findSymbolReferences.bind(this)
    );

    // 注册符号定义查找命令
    const goToDefinitionCommand = vscode.commands.registerCommand(
      'extension.goToSymbolDefinition',
      this.goToSymbolDefinition.bind(this)
    );

    context.subscriptions.push(
      jumpToSymbolCommand,
      findReferencesCommand,
      goToDefinitionCommand
    );
  }

  private async jumpToSymbol(uri: vscode.Uri, range?: vscode.Range): Promise<void> {
    try {
      // 打开文档
      const document = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(document);

      if (range) {
        // 设置光标位置和选择范围
        editor.selection = new vscode.Selection(range.start, range.end);
        // 滚动到可见区域
        editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`无法跳转到符号: ${error}`);
    }
  }

  private async findSymbolReferences(symbolName: string, uri: vscode.Uri): Promise<void> {
    try {
      const document = await vscode.workspace.openTextDocument(uri);
      
      // 使用 VSCode 内置的引用查找功能
      const references = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeReferenceProvider',
        uri,
        new vscode.Position(0, 0)
      );

      if (references && references.length > 0) {
        // 显示引用列表
        await vscode.commands.executeCommand('editor.action.findReferences');
      } else {
        vscode.window.showInformationMessage(`未找到符号 "${symbolName}" 的引用`);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`查找引用失败: ${error}`);
    }
  }

  private async goToSymbolDefinition(symbolName: string, uri: vscode.Uri, position: vscode.Position): Promise<void> {
    try {
      // 使用 VSCode 内置的定义查找功能
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider',
        uri,
        position
      );

      if (definitions && definitions.length > 0) {
        const definition = definitions[0];
        await this.jumpToSymbol(definition.uri, definition.range);
      } else {
        vscode.window.showInformationMessage(`未找到符号 "${symbolName}" 的定义`);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`查找定义失败: ${error}`);
    }
  }
}

// 增强的符号提供器，用于更好的符号识别
export class EnhancedSymbolProvider {
  public static createSymbolLink(
    symbolName: string,
    location: vscode.Location,
    symbolType: string
  ): string {
    // 创建带有图标的符号链接
    const icon = this.getSymbolIcon(symbolType);
    const commandUri = vscode.Uri.parse(
      `command:extension.jumpToSymbol?${encodeURIComponent(JSON.stringify([
        location.uri,
        location.range
      ]))}`
    );

    return `${icon}[${symbolName}](${commandUri} "${symbolType}: ${symbolName}")`;
  }

  public static createDefinitionLink(
    symbolName: string,
    location: vscode.Location
  ): string {
    const commandUri = vscode.Uri.parse(
      `command:extension.goToSymbolDefinition?${encodeURIComponent(JSON.stringify([
        symbolName,
        location.uri,
        location.range.start
      ]))}`
    );

    return `[📍 转到定义](${commandUri} "转到 ${symbolName} 的定义")`;
  }

  public static createReferencesLink(
    symbolName: string,
    location: vscode.Location
  ): string {
    const commandUri = vscode.Uri.parse(
      `command:extension.findSymbolReferences?${encodeURIComponent(JSON.stringify([
        symbolName,
        location.uri
      ]))}`
    );

    return `[🔍 查找引用](${commandUri} "查找 ${symbolName} 的所有引用")`;
  }

  private static getSymbolIcon(symbolType: string): string {
    const iconMap: Record<string, string> = {
      'variable': '🔢 ',
      'function': '⚡ ',
      'method': '🔧 ',
      'class': '🏗️ ',
      'property': '📝 ',
      'interface': '📋 ',
      'enum': '📚 ',
      'type': '🏷️ '
    };

    return iconMap[symbolType] || '📌 ';
  }
}

// Markdown 渲染器增强
export class EnhancedMarkdownProvider {
  public static enhanceSymbolMarkdown(
    text: string,
    symbols: Array<{name: string; location: vscode.Location; type: string}>
  ): string {
    let enhancedText = text;

    symbols.forEach(symbol => {
      const regex = new RegExp(`\\b${this.escapeRegExp(symbol.name)}\\b`, 'g');
      
      enhancedText = enhancedText.replace(regex, (match) => {
        // 创建包含多个操作的符号链接
        const symbolLink = EnhancedSymbolProvider.createSymbolLink(
          match,
          symbol.location,
          symbol.type
        );
        
        const definitionLink = EnhancedSymbolProvider.createDefinitionLink(
          match,
          symbol.location
        );
        
        const referencesLink = EnhancedSymbolProvider.createReferencesLink(
          match,
          symbol.location
        );

        // 创建一个包含所有操作的工具提示
        return `${symbolLink} (${definitionLink} | ${referencesLink})`;
      });
    });

    return enhancedText;
  }

  private static escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}