import * as vscode from "vscode";

export const chatExplain = async (args: any) => {
  const errorText = args.errorText;
  const errMessage = args.errMessage;

  await vscode.commands.executeCommand(
    "workbench.panel.chat.view.copilot.focus"
  );

  const message = `/explain ${errMessage}`;

  vscode.commands.executeCommand(
    "workbench.action.chat.submitWithoutDispatching",
    {
      inputValue: message,
    }
  );
};
