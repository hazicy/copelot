import * as vscode from "vscode";

import { OpenAICompatibleModelChatProvider } from "./providers/openai-compatible";

export type ModelConfig = {
  modelID: string;
  baseURL: string;
  apiKey: string;
  topK?: number;
  topP?: number;
  temperature?: number;
} & vscode.ChatResponseProviderMetadata;

export function loadAndRegisterModels() {
  const config = vscode.workspace.getConfiguration("chatModels");
  const models = config.get<ModelConfig[]>("models", []);

  const validModels = models.filter((model) => {
    if (!model.modelID || !model.baseURL || !model.apiKey) {
      return false;
    }
    return true;
  });

  if (validModels.length > 0) {
    registerModels(validModels);
  }
}

export function watchConfigurationChanges(): vscode.Disposable {
  return vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("chatModels.models")) {
      vscode.window.showInformationMessage("Reloading AI models...");
      loadAndRegisterModels();
    }
  });
}

function registerModels(configs: ModelConfig[]) {
  for (const config of configs) {
    vscode.lm.registerChatModelProvider(
      config.modelID,
      new OpenAICompatibleModelChatProvider(
        config.baseURL,
        config.apiKey,
        config.modelID
      ),
      {
        maxInputTokens: config.maxInputTokens,
        family: config.family,
        name: config.name,
        isDefault: config.isDefault,
        vendor: config.vendor,
        version: config.version,
        maxOutputTokens: config.maxOutputTokens,
        isUserSelectable: config.isUserSelectable,
      }
    );
  }
}
