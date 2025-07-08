import * as vscode from "vscode";

class LoggerSingleton extends vscode.Disposable {
  private readonly disposable: vscode.Disposable;
  private static instance: LoggerSingleton;
  private readonly outputChannel: vscode.LogOutputChannel;

  private constructor() {
    super(() => {
      this.dispose();
    });

    // Create the output channel
    this.outputChannel = vscode.window.createOutputChannel("Flexpilot", {
      log: true,
    });

    // Register the command to view logs
    this.disposable = vscode.commands.registerCommand(
      "flexpilot.viewLogs",
      () => this.outputChannel.show()
    );
  }

  public static getInstance(): LoggerSingleton {
    if (!LoggerSingleton.instance) {
      LoggerSingleton.instance = new LoggerSingleton();
    }
    return LoggerSingleton.instance;
  }

  public info(message: string, ...args: unknown[]): void {
    this.outputChannel.info(message, ...args);
  }

  public warn(message: string, ...args: unknown[]): void {
    this.outputChannel.warn(message, ...args);
  }

  public error(message: string, ...args: unknown[]): void {
    this.outputChannel.error(message, ...args);
  }

  public dispose(): void {
    super.dispose();
  }
}

const logger = LoggerSingleton.getInstance();

export default logger;