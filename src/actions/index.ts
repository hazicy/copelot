import { AIExplainProvider } from "./ai-explain";
import * as vscode from "vscode";
import { AIFixProvider } from "./ai-fix";

export function registerCodeActions() {
  const copilotExplainProvider = new AIExplainProvider();
  const copilotFixProvider = new AIFixProvider();

  vscode.languages.registerCodeActionsProvider(
    {
      scheme: "file",
      language: "*",
    },
    copilotExplainProvider,
    {
      providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
    }
  );

  vscode.languages.registerCodeActionsProvider(
    {
      scheme: "file",
      language: "*",
    },
    copilotFixProvider,
    {
      
      providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
    }
  );
}
