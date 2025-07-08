import * as vscode from "vscode";

export const chatFix = async (args: {
  errorText: string;
  errMessage: string;
  range: vscode.Range;
}) => {
  const errorText = args.errorText;
  const errMessage = args.errMessage;
  const range = args.range;

  const message = `/fix ${errMessage}`;

  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    return;
  }
  
  const selection = editor.selection;

  await vscode.commands.executeCommand("inlineChat.start", {
    message,
    autoSend: true,
    initialSelection: {
      selectionStartLineNumber: selection.start.line,
      selectionStartColumn: selection.start.character,
      positionLineNumber: selection.end.line,
      positionColumn: selection.end.character,
    },
    initialRange: {
      startLineNumber: range.start.line,
      startColumn: range.start.character,
      endLineNumber: range.end.line,
      endColumn: range.end.character,
    },
  });
};

interface InlineChatRunOptions {
  initialSelection?: {
    /**
     * The line number on which the selection has started.
     */
    readonly selectionStartLineNumber: number;
    /**
     * The column on `selectionStartLineNumber` where the selection has started.
     */
    readonly selectionStartColumn: number;
    /**
     * The line number on which the selection has ended.
     */
    readonly positionLineNumber: number;
    /**
     * The column on `positionLineNumber` where the selection has ended.
     */
    readonly positionColumn: number;
  };
  initialRange?: {
    readonly startLineNumber: number;
    /**
     * Column on which the range starts in line `startLineNumber` (starts at 1).
     */
    readonly startColumn: number;
    /**
     * Line number on which the range ends.
     */
    readonly endLineNumber: number;
    /**
     * Column on which the range ends in line `endLineNumber`.
     */
    readonly endColumn: number;
  };
  message?: string;
  attachments?: vscode.Uri[];
  autoSend?: boolean;
  existingSession?: string;
  position?: {
    /**
     * line number (starts at 1)
     */
    readonly lineNumber: number;
    /**
     * column (the first character in a line is between column 1 and column 2)
     */
    readonly column: number;
  };
}
