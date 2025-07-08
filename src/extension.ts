import * as l10n from "@vscode/l10n";
import * as vscode from "vscode";
import { registerCommands } from "./commands/index.js";
import { registeTools as registerTools } from "./tools/index.js";
import { registerCodeActions } from "./actions/index.js";
import { registerParticipants } from "./participants/index.js";
import "./inline/completion/provider.js";
import { registerInlineEdit } from "./inline/edit/provider.js";
import { registerInlineCompletion } from "./inline/completion/provider.js";
import { loadAndRegisterModels, watchConfigurationChanges } from "./models.js";
import { SymbolNavigationProvider } from "./participants/default/symbol-provider.js";

/**
 * Activates the extension.
 *
 */
export async function activate(context: vscode.ExtensionContext) {
  if (vscode.l10n.bundle) {
    l10n.config({ contents: vscode.l10n.bundle });
  }

  loadAndRegisterModels();
  watchConfigurationChanges();

  // 注册所有命令
  registerCommands();
  SymbolNavigationProvider.getInstance().registerCommands(context);

  registerParticipants(context);
  registerInlineCompletion();
  registerInlineEdit();
  registerCodeActions();
  registerTools();
}

export function deactivate() {}
