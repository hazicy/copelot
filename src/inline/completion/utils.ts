import * as vscode from "vscode";
import type { PrefixSuffix } from "./provider";
import { FIM_TEMPLATE_FORMAT, stopSequencesMap } from "./constants";

export function getPrefixSuffix(
  document: vscode.TextDocument,
  position: vscode.Position,
  contextRatio: number[] = [0.7, 0.3]
): PrefixSuffix {
  const currentLine = position.line;
  const numLinesToEnd = document.lineCount - currentLine;

  // 计算要获取的前缀、后缀行数
  let numLinesPrefix = Math.floor(Math.abs(15 * contextRatio[0]));
  let numLinesSuffix = Math.ceil(Math.abs(15 * contextRatio[1]));

  if (numLinesPrefix > currentLine) {
    numLinesSuffix += numLinesPrefix - currentLine;
    numLinesPrefix = currentLine;
  }

  if (numLinesSuffix > numLinesToEnd) {
    numLinesPrefix += numLinesSuffix - numLinesToEnd;
    numLinesSuffix = numLinesToEnd;
  }

  const prefixRange = new vscode.Range(
    Math.max(0, currentLine - numLinesPrefix),
    0,
    currentLine,
    position.character
  );

  const suffixRange = new vscode.Range(
    currentLine,
    position.character,
    currentLine + numLinesSuffix,
    0
  );

  return {
    prefix: document.getText(prefixRange),
    suffix: document.getText(suffixRange),
  };
}

export function getStopSequences(modelName: string) {
  for (const model of [
    FIM_TEMPLATE_FORMAT.automatic,
    FIM_TEMPLATE_FORMAT.codegemma,
    FIM_TEMPLATE_FORMAT.codellama,
    FIM_TEMPLATE_FORMAT.codeqwen,
    FIM_TEMPLATE_FORMAT.codestral,
    FIM_TEMPLATE_FORMAT.custom,
    FIM_TEMPLATE_FORMAT.deepseek,
    FIM_TEMPLATE_FORMAT.llama,
    FIM_TEMPLATE_FORMAT.stableCode,
    FIM_TEMPLATE_FORMAT.starcoder,
  ]) {
    if (modelName.includes(model)) {
      return stopSequencesMap[model];
    }
  }
}

