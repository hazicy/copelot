import * as vscode from "vscode";
import type { GitExtension } from "../../types/git";

export const generateCommitMessage = async (repositoryUri: vscode.Uri) => {
  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.SourceControl },
    async () => {
      const gitExtension =
        vscode.extensions.getExtension<GitExtension>("vscode.git");

      if (!gitExtension) {
        throw new Error(vscode.l10n.t("没有安装 Git"));
      }

      const repository = gitExtension.exports
        .getAPI(1)
        .getRepository(repositoryUri);

      if (!repository) {
        throw new Error(vscode.l10n.t("没有找到仓库"));
      }

      const diff = await repository.diff(true);

      if (!diff) {
        vscode.window.showErrorMessage(
          vscode.l10n.t("没有暂存的修改，请稍后重试")
        );
      }

      const [chatModel] = await vscode.lm.selectChatModels();
      if (!chatModel) {
        vscode.window.showErrorMessage(vscode.l10n.t("没有可使用的模型"));
      }

      const { text } = await chatModel.sendRequest([]);
      let responseText: string = "";
      for await (const chunk of text) {
        responseText = responseText.concat(chunk);
      }

      const commitMessage = responseText.match(
        /<git-commit-message>([^]*?)<\/git-commit-message>/
      );
      if (!commitMessage?.length) {
        throw new Error(
          vscode.l10n.t("模型没有返回一个正确的 commit 信息，请重试")
        );
      }

      // Set the commit message in the input box
      repository.inputBox.value =
        commitMessage[1].trim() ||
        vscode.l10n.t("我没法提供一个有效的 commit 信息给您");
    }
  );
};
