import {
  PromptElement,
  PromptReference,
  UserMessage,
  type PromptElementProps,
  type PromptPiece,
  type PromptSizing,
} from "@vscode/prompt-tsx";
import { Tag } from "@vscode/prompt-tsx-elements";
import * as vscode from "vscode";

export class ReferencesPrompt extends PromptElement<
  PromptElementProps<{
    references: ReadonlyArray<vscode.ChatPromptReference>;
    excludeReferences?: boolean;
  }>
> {
  async render() {
    return (
      <UserMessage>
        {this.props.references.map((ref) => (
          <PromptReferenceElement reference={ref}></PromptReferenceElement>
        ))}
      </UserMessage>
    );
  }
}

class PromptReferenceElement extends PromptElement<
  PromptElementProps<{
    reference: vscode.ChatPromptReference;
    excludeReferences?: boolean;
  }>
> {
  async render(
    _state: void,
    _sizing: PromptSizing
  ): Promise<PromptPiece | undefined> {
    const value = this.props.reference.value;
    if (value instanceof vscode.Uri) {
      const fileContents = (
        await vscode.workspace.fs.readFile(value)
      ).toString();
      return (
        <Tag name="attachment">
          {!this.props.excludeReferences && (
            <references value={[new PromptReference(value)]} />
          )}
          {value.fsPath}:<br />
          ``` <br />
          {fileContents}
          <br />
          ```
          <br />
        </Tag>
      );
    } else if (value instanceof vscode.Location) {
      const rangeText = (
        await vscode.workspace.openTextDocument(value.uri)
      ).getText(value.range);
      return (
        <Tag name="attachment">
          {!this.props.excludeReferences && (
            <references value={[new PromptReference(value)]} />
          )}
          {value.uri.fsPath}:{value.range.start.line + 1}-$
          <br />
          {value.range.end.line + 1}: <br />
          ```
          <br />
          {rangeText}
          <br />
          ```
        </Tag>
      );
    } else if (typeof value === "string") {
      return <Tag name="attachment">{value}</Tag>;
    }
  }
}
