import * as vscode from "vscode";

// 定义一个实现 vscode.CodeActionProvider 接口的类 QuickExplainProvider
export class AIExplainProvider implements vscode.CodeActionProvider {
  // 类的构造函数
  constructor() {}

  // 提供代码操作的方法
  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<(vscode.CodeAction | vscode.Command)[]> {
    // 如果诊断信息不存在或长度为 0，则返回 undefined
    if (!context.diagnostics || context.diagnostics.length === 0) {
      return undefined;
    }

    // 用于存储代码操作的数组
    const actions: vscode.CodeAction[] = [];

    // 遍历诊断信息
    for (const diagnostic of context.diagnostics) {
      // 创建解释错误的操作
      const action = this.createExplainErrorAction(document, diagnostic);
      if (action) {
        actions.push(action);
      }
    }

    return actions;
  }

  // 私有方法，用于创建解释错误的操作
  private createExplainErrorAction(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ) {
    // 获取错误的范围
    const errorRange = diagnostic.range;
    // 获取错误范围内的文本
    const errorText = document.getText(errorRange);

    // 创建一个代码操作，标题为“使用 Copilot 解释”，类型为快速修复
    const action = new vscode.CodeAction(
      `使用 Copilot 解释`,
      vscode.CodeActionKind.QuickFix
    );

    // 为操作设置命令，包括标题、命令名称和参数
    action.command = {
      title: vscode.l10n.t("解释错误"),
      command: "copelot.chatExplain",
      arguments: [
        {
          errorText,
          errMessage: diagnostic.message,
        },
      ],
    };

    // 设置该操作是由 AI 提供的
    action.isAI = true;

    return action;
  }
}
