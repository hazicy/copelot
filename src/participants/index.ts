import * as vscode from "vscode";
import { PanelParticipant } from "./default/participant";
import { EditingSessionEditorParticipant } from "./editing-session-editor/participant";
import { EditingSessionParticipant } from "./editing-session/participant";
import { EditsAgentParticipant } from "./edits-agent/participant";
import { TerminalParticipant } from "./terminal/participant";
import { WorkspaceParticipant } from "./workspace/participant";

export function registerParticipants(context: vscode.ExtensionContext) {
  new PanelParticipant();
  new EditingSessionEditorParticipant();
  new EditingSessionParticipant();
  new EditsAgentParticipant();
  new TerminalParticipant();
  new WorkspaceParticipant();
}
