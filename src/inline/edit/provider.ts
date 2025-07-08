import * as vscode from "vscode";

class InlineEditProvider implements vscode.InlineEditProvider {
  displayName?: string | undefined;

  constructor() {}

  async provideInlineEdit(
    document: vscode.TextDocument,
    context: vscode.InlineEditContext,
    token: vscode.CancellationToken
  ): Promise<vscode.InlineEdit | null | undefined> {
    context.triggerKind = vscode.InlineEditTriggerKind.Invoke;

    document.getText();
    // const models = await vscode.lm.selectChatModels({
    //   id: "ds",
    // });

    // models.pop()?.sendRequest([vscode.LanguageModelChatMessage.User("6")]);

    // console.log(models);

    // const inlineEdit = new vscode.InlineEdit(
    //   "await vscode",
    //   new vscode.Range(new vscode.Position(0, 0), new vscode.Position(10, 0))
    // );

    // return inlineEdit;

    return undefined;
  }
}

export function registerInlineEdit() {
  vscode.languages.registerInlineEditProvider(
    { pattern: "**/*.{ts,js,tsx,jsx,py,go,java,c,cpp,rs}" },
    new InlineEditProvider()
  );
}
