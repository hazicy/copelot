import * as vscode from "vscode";

export class GetErrorsTool implements vscode.LanguageModelTool<any> {
  static id: string = "copelot_getErrors";

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<any>,
    token: vscode.CancellationToken
  ) {
    try {
      // Get all diagnostics across all open files
      const allDiagnostics: {
        uri: vscode.Uri;
        diagnostics: vscode.Diagnostic[];
      }[] = [];

      // Get all open text editors
      const editors = vscode.window.visibleTextEditors;

      // Collect diagnostics from each open document
      for (const editor of editors) {
        const uri = editor.document.uri;
        const diagnostics = vscode.languages.getDiagnostics(uri);
        if (diagnostics.length > 0) {
          allDiagnostics.push({ uri, diagnostics });
        }
      }

      // Format the diagnostics information
      let errorReport = "";

      if (allDiagnostics.length === 0) {
        errorReport = "No errors or warnings found in open documents.";
      } else {
        for (const { uri, diagnostics } of allDiagnostics) {
          const fileName = uri.fsPath.split(/[\/\\]/).pop() || uri.fsPath;
          errorReport += `\n## Errors in ${fileName}\n\n`;

          for (const diag of diagnostics) {
            const severity = this.getSeverityString(diag.severity);
            const line = diag.range.start.line + 1;
            const character = diag.range.start.character + 1;
            const message = diag.message;

            errorReport += `- ${severity} at line ${line}, column ${character}: ${message}\n`;

            // If available, add the code and related information
            if (diag.code) {
              errorReport += `  Code: ${
                typeof diag.code === "object" ? diag.code.value : diag.code
              }\n`;
            }

            if (diag.relatedInformation && diag.relatedInformation.length > 0) {
              errorReport += `  Related information:\n`;
              for (const info of diag.relatedInformation) {
                const relatedFile =
                  info.location.uri.fsPath.split(/[\/\\]/).pop() ||
                  info.location.uri.fsPath;
                const relatedLine = info.location.range.start.line + 1;
                errorReport += `    - ${relatedFile}:${relatedLine} - ${info.message}\n`;
              }
            }
          }
        }
      }

      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          `Here are the errors and warnings found in your open editor(s):\n\n${errorReport}`
        ),
      ]);
    } catch (error) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          `An error occurred while retrieving diagnostics: ${
            error instanceof Error ? error.message : String(error)
          }`
        ),
      ]);
    }
  }

  private getSeverityString(severity: vscode.DiagnosticSeverity): string {
    switch (severity) {
      case vscode.DiagnosticSeverity.Error:
        return "Error";
      case vscode.DiagnosticSeverity.Warning:
        return "Warning";
      case vscode.DiagnosticSeverity.Information:
        return "Information";
      case vscode.DiagnosticSeverity.Hint:
        return "Hint";
      default:
        return "Unknown";
    }
  }
}
