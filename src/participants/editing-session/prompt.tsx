import {
  PromptElement,
  UserMessage,
  type PromptElementProps,
  type PromptSizing,
} from "@vscode/prompt-tsx";
import { Tag } from "@vscode/prompt-tsx-elements";
import * as vscode from "vscode";
import { HistoryPrompt } from "../../prompts/history-prompt";
import { ReferencesPrompt } from "../../prompts/references-prompt";

export class EditSessionPrompt extends PromptElement<
  PromptElementProps<{
    references: ReadonlyArray<vscode.ChatPromptReference>;
    userQuery: string;
    history: vscode.ChatContext["history"];
  }>
> {
  async render(state: void, sizing: PromptSizing) {
    return (
      <>
        <HistoryPrompt history={this.props.history}></HistoryPrompt>
        <UserMessage>
          The user has a request for modifying one or more files.
          <br />
          1. Please come up with a solution that you first describe
          step-by-step.
          <br />
          2. Group your changes by file. Use the file path as the header.
          <br />
          3. For each file, give a short summary of what needs to be changed
          followed by a code block that contains the code changes.
          <br />
          4. The code block should start with four backticks followed by the
          language.
          <br />
          5. On the first line of the code block add a comment containing the
          filepath. This includes Markdown code blocks.
          <br />
          6. Use a single code block per file that needs to be modified, even if
          there are multiple changes for a file.
          <br />
          7. The user is very smart and can understand how to merge your code
          blocks into their files, you just need to provide minimal hints.
          <br />
          Respond in the user input language.
          <br />
          Here is an example of how you should format a code block belonging to
          the file example.ts in your response:
          <br />
          <Tag name="file-modification">
            <br />
            <Tag name="change-description">
              <br />
              // description
              <br />
            </Tag>
            <br />
            <Tag name="complete-file-uri">
              <br />
              file:///exact/complete/path/to/file/test1.ts
              <br />
            </Tag>
            <br />
            <Tag name="updated-file-content">
              <br />
              ````langaugeId
              <br />
              // code
              <br />
              ````
              <br />
            </Tag>
            <br />
          </Tag>
        </UserMessage>
        <UserMessage>
          <ReferencesPrompt
            references={this.props.references}
          ></ReferencesPrompt>
          {this.props.userQuery}
        </UserMessage>
      </>
    );
  }
}
