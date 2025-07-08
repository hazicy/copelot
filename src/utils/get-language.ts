import * as vscode from "vscode";
import { supportedLanguages, type CodeLanguageDetails } from "../common/languages";

export interface LanguageType {
  language: CodeLanguageDetails;
  languageId: string | undefined;
}

export const getLanguage = (): LanguageType => {
  const editor = vscode.window.activeTextEditor;
  const languageId = editor?.document.languageId;
  const language =
    supportedLanguages[languageId as keyof typeof supportedLanguages];
  return {
    language,
    languageId,
  };
};