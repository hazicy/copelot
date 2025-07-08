import * as vscode from "vscode";
import { GetErrorsTool } from "./get-errors";

export function registeTools() {
  vscode.lm.registerTool(GetErrorsTool.id, new GetErrorsTool());
}
