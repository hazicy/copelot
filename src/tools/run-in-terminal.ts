// import * as vscode from "vscode";

// export class RunInTerminalTool implements vscode.LanguageModelTool<any> {
//   static id: string = "copelot_run-in-terminal";

//   prepareInvocation2(
//     options: vscode.LanguageModelToolInvocationPrepareOptions<any>,
//     token: vscode.CancellationToken
//   ): vscode.ProviderResult<vscode.PreparedTerminalToolInvocation> {
//     // Get the command from the request's arguments
//     const command = options.invocation.arguments?.command;

//     if (!command || typeof command !== "string" || command.trim() === "") {
//       return {
//         invokable: false,
//         message: "Please provide a command to run in the terminal.",
//       };
//     }

//     // Return a prepared invocation with the command
//     return {
//       invokable: true,
//       message: `Ready to run command: ${command}`,
//     };
//   }

//   async invoke(
//     options: vscode.LanguageModelToolInvocationOptions<any>,
//     token: vscode.CancellationToken
//   ): vscode.ProviderResult<vscode.LanguageModelToolResult> {
//     try {
//       const command = options.invocation.arguments?.command;

//       if (!command || typeof command !== "string") {
//         return new vscode.LanguageModelToolResult([
//           new vscode.LanguageModelTextPart(
//             "No command provided to run in terminal."
//           ),
//         ]);
//       }

//       // Create a new terminal or get the active one
//       let terminal = vscode.window.activeTerminal;
//       if (!terminal) {
//         terminal = vscode.window.createTerminal("copelot Command");
//       }

//       // Show the terminal
//       terminal.show();

//       // Send the command to the terminal
//       terminal.sendText(command);

//       return new vscode.LanguageModelToolResult([
//         new vscode.LanguageModelTextPart(
//           `Command executed in terminal: \`${command}\`\n\nPlease check the terminal for output.`
//         ),
//       ]);
//     } catch (error) {
//       return new vscode.LanguageModelToolResult([
//         new vscode.LanguageModelTextPart(
//           `An error occurred while running the command: ${
//             error instanceof Error ? error.message : String(error)
//           }`
//         ),
//       ]);
//     }
//   }
// }
