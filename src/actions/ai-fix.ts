import * as vscode from "vscode";

export class AIFixProvider implements vscode.CodeActionProvider {
  constructor() {}

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<(vscode.CodeAction | vscode.Command)[]> {
    if (!context.diagnostics || context.diagnostics.length === 0) {
      return undefined;
    }

    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      const action = this.createExplainErrorAction(document, diagnostic, range);
      if (action) {
        actions.push(action);
      }
    }

    return actions;
  }

  private createExplainErrorAction(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    range: vscode.Range
  ) {
    const errorRange = diagnostic.range;
    const errorText = document.getText(errorRange);

    const action = new vscode.CodeAction(
      vscode.l10n.t("使用 Copilot 修复"),
      vscode.CodeActionKind.QuickFix
    );

    action.command = {
      title: vscode.l10n.t("修复错误"),
      command: "copelot.chatFix",
      arguments: [
        {
          errorText,
          errMessage: diagnostic.message,
          range
        },
      ],
    };

    action.isAI = true;

    return action;
  }
}
