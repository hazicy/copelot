import { renderPrompt } from "@vscode/prompt-tsx";
import * as vscode from "vscode";
import { EditSessionPrompt } from "./prompt";
import * as diff from "diff";

enum ParseState {
  FILEPATH,
  CODE,
  EXPLANATION,
}

export class EditingSessionParticipant {
  private readonly chatParticipant: vscode.ChatParticipant;
  private fileEditsMap: Map<string, vscode.TextEdit[]> = new Map();
  private tempBuffers: Map<string, string> = new Map();

  constructor() {
    this.chatParticipant = vscode.chat.createChatParticipant(
      "copelot.editingSession",
      this.handleChatRequest.bind(this)
    );
  }

  async handleChatRequest(
    request: vscode.ChatRequest,
    context: vscode.ChatContext,
    response: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<void> {
    // 重置编辑映射
    this.fileEditsMap.clear();
    this.tempBuffers.clear();

    const prompt = await renderPrompt(
      EditSessionPrompt,
      {
        history: context.history,
        userQuery: request.prompt,
        references: request.references,
      },
      {
        modelMaxPromptTokens: 4960,
      },
      request.model
    );

    const { stream } = await request.model.sendRequest(
      prompt.messages,
      {},
      token
    );

    // 初始状态和缓冲区
    let currentState = ParseState.EXPLANATION;
    let currentFilePath = "";
    let currentCode = "";
    let insideCodeBlock = false;
    let processedFiles = new Set<string>();
    let markdownBeforeBlock = "";

    // 用于处理可能跨多个块的分割行
    let accumulatedContent = "";

    // 处理流式响应
    for await (const chunk of stream) {
      if (chunk instanceof vscode.LanguageModelTextPart) {
        // 将新块添加到缓冲区
        accumulatedContent += chunk.value;

        // 处理完整的行，保留部分行在缓冲区
        const lines = accumulatedContent.split("\n");

        // 保留最后一行在缓冲区，因为它可能不完整
        const lastLine = lines.pop();
        if (lastLine !== undefined) {
          if (accumulatedContent.endsWith("\n")) {
            // 如果缓冲区以换行符结束，最后一行实际上是完整的
            lines.push(lastLine);
            accumulatedContent = "";
          } else {
            // 最后一行不完整，保留在缓冲区
            accumulatedContent = lastLine;
          }
        }

        let markdownBuffer = "";

        for (const line of lines) {
          // 检测文件路径（以 ### 开头）
          if (line.startsWith("### ")) {
            // 输出任何缓冲的markdown内容
            if (markdownBuffer.length > 0) {
              response.markdown(markdownBuffer);
              markdownBeforeBlock += markdownBuffer;
              markdownBuffer = "";
            }

            // 如果有正在处理的代码块，先结束它
            if (insideCodeBlock) {
              insideCodeBlock = false;
              // 实时更新代码的最终版本
              this.updateCodeInEditor(
                currentFilePath,
                currentCode,
                response,
                markdownBeforeBlock
              );
              currentCode = "";
              markdownBeforeBlock = "";
            }

            currentFilePath = line.substring(4).trim();
            markdownBuffer = line + "\n"; // 包含标题行
            currentState = ParseState.EXPLANATION;
            continue;
          }

          // 检测代码块开始
          if (line.startsWith("````") || line.startsWith("```")) {
            if (!insideCodeBlock) {
              // 输出解释内容
              if (markdownBuffer.length > 0) {
                response.markdown(markdownBuffer);
                markdownBeforeBlock += markdownBuffer;
                markdownBuffer = "";
              }

              insideCodeBlock = true;
              currentState = ParseState.CODE;
              // 重置当前代码缓冲区
              currentCode = "";
              continue;
            } else {
              // 代码块结束
              insideCodeBlock = false;
              // 实时更新代码的最终版本
              this.updateCodeInEditor(
                currentFilePath,
                currentCode,
                response,
                markdownBeforeBlock
              );
              currentCode = "";
              markdownBeforeBlock = "";
              currentState = ParseState.EXPLANATION;
              continue;
            }
          }

          // 根据当前状态处理内容
          switch (currentState) {
            case ParseState.EXPLANATION:
              markdownBuffer += line + "\n";
              break;
            case ParseState.CODE:
              if (insideCodeBlock) {
                currentCode += line + "\n";
                // 实时更新代码，但不增加文件编辑，只是更新显示
                if (currentFilePath) {
                  // 为了流式更新，我们需要在每行添加后更新临时缓冲区
                  const tempKey = `${currentFilePath}:temp`;
                  const tempBuffer = this.tempBuffers.get(tempKey) || "";
                  this.tempBuffers.set(tempKey, tempBuffer + line + "\n");

                  // 创建一个临时的编辑器更新，但不保存到fileEditsMap
                  this.streamCodeUpdate(
                    currentFilePath,
                    this.tempBuffers.get(tempKey) || "",
                    response
                  );
                }
              }
              break;
          }
        }

        // 输出任何剩余的markdown内容
        if (markdownBuffer.length > 0) {
          response.markdown(markdownBuffer);
          markdownBeforeBlock += markdownBuffer;
        }
      }
    }

    // 处理剩余在缓冲区的内容
    if (accumulatedContent.length > 0) {
      if (currentState === ParseState.EXPLANATION) {
        response.markdown(accumulatedContent);
        markdownBeforeBlock += accumulatedContent;
      } else if (currentState === ParseState.CODE && insideCodeBlock) {
        currentCode += accumulatedContent;
        // 更新代码显示
        if (currentFilePath) {
          const tempKey = `${currentFilePath}:temp`;
          const tempBuffer = this.tempBuffers.get(tempKey) || "";
          this.tempBuffers.set(tempKey, tempBuffer + accumulatedContent);
          this.streamCodeUpdate(
            currentFilePath,
            this.tempBuffers.get(tempKey) || "",
            response
          );
        }
      }
    }

    // 处理可能剩余未处理的代码块
    if (insideCodeBlock && currentCode.length > 0) {
      this.updateCodeInEditor(
        currentFilePath,
        currentCode,
        response,
        markdownBeforeBlock
      );
    }

    // 确保所有文件编辑都被标记为完成
    for (const filePath of this.fileEditsMap.keys()) {
      if (!processedFiles.has(filePath)) {
        const uri = vscode.Uri.file(filePath);
        response.textEdit(uri, true);
        processedFiles.add(filePath);
      }
    }

    // 添加编辑确认消息
    if (processedFiles.size > 0) {
      response.markdown("\n\n---\n\n");
      response.markdown(
        `### 已提供编辑建议\n\n已为 ${processedFiles.size} 个文件提供编辑建议。您可以在VS Code中查看并接受这些更改。`
      );
    }
  }

  // 用于实时更新代码的方法 - 仅用于显示，不添加到fileEditsMap
  private streamCodeUpdate(
    filePath: string,
    code: string,
    response: vscode.ChatResponseStream
  ): void {
    if (!filePath) {return;}

    // 创建一个临时的URI
    const uri = vscode.Uri.file(filePath);

    // 移除所有 filepath 注释行
    const codeLines = code
      .split("\n")
      .filter((line) => !line.includes("// filepath:"));

    // 移除占位符
    const cleanCode = codeLines
      .join("\n")
      .replace(/\/\/ ...existing code.../g, "");

    // 创建一个临时的编辑
    const edit = new vscode.TextEdit(
      new vscode.Range(0, 0, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER),
      cleanCode
    );

    // 发送编辑但不标记为完成
    response.textEdit(uri, edit);
  }

  // 用于最终更新代码的方法 - 添加到fileEditsMap并处理
  private async updateCodeInEditor(
    filePath: string,
    code: string,
    response: vscode.ChatResponseStream,
    markdownBeforeBlock: string = ""
  ): Promise<void> {
    if (!filePath || code.trim().length === 0) {return;}

    // 移除所有 filepath 注释行
    let codeLines = code.split("\n");
    codeLines = codeLines.filter((line) => !line.includes("// filepath:"));
    code = codeLines.join("\n");

    // 获取当前文件内容（如果文件存在）
    let originalContent = "";
    let fileExists = false;
    try {
      const document = await vscode.workspace.openTextDocument(
        vscode.Uri.file(filePath)
      );
      originalContent = document.getText();
      fileExists = true;
    } catch (e) {
      // 文件不存在，将使用完整替换
    }

    // 准备编辑
    let edits: vscode.TextEdit[] = [];

    if (fileExists) {
      // 处理代码中的"// ...existing code..."占位符
      const segments = code.split("// ...existing code...");

      if (segments.length <= 1) {
        // 如果没有占位符，则整个替换文件
        edits.push(
          new vscode.TextEdit(
            new vscode.Range(
              0,
              0,
              Number.MAX_SAFE_INTEGER,
              Number.MAX_SAFE_INTEGER
            ),
            code
          )
        );
      } else {
        try {
          // 使用diff库来处理有占位符的情况
          edits = this.createEditsWithDiff(originalContent, code);
        } catch (e) {
          // 如果diff处理失败，回退到完整替换，但移除占位符
          edits = [
            new vscode.TextEdit(
              new vscode.Range(
                0,
                0,
                Number.MAX_SAFE_INTEGER,
                Number.MAX_SAFE_INTEGER
              ),
              code.replace(/\/\/ ...existing code.../g, "")
            ),
          ];
        }
      }
    } else {
      // 文件不存在，创建新文件（确保移除占位符）
      const newFileContent = code.replace(/\/\/ ...existing code.../g, "");
      edits.push(
        new vscode.TextEdit(new vscode.Range(0, 0, 0, 0), newFileContent)
      );
    }

    // 存储编辑
    if (!this.fileEditsMap.has(filePath)) {
      this.fileEditsMap.set(filePath, []);
    }

    this.fileEditsMap.get(filePath)!.push(...edits);

    // 提交编辑到响应
    const uri = vscode.Uri.file(filePath);
    for (const edit of edits) {
      response.textEdit(uri, edit);
    }

    // 标记编辑完成
    response.textEdit(uri, true);
  }

  // 使用diff库创建编辑
  private createEditsWithDiff(
    originalContent: string,
    newCodeWithPlaceholders: string
  ): vscode.TextEdit[] {
    // 移除占位符
    const newCode = newCodeWithPlaceholders.replace(
      /\/\/ ...existing code.../g,
      ""
    );

    // 如果新代码与原始内容相同，则不需要编辑
    if (originalContent === newCode) {
      return [];
    }

    // 如果新代码包含"// ...existing code..."，我们需要更智能地合并
    if (newCodeWithPlaceholders.includes("// ...existing code...")) {
      return this.createSmartEdits(originalContent, newCodeWithPlaceholders);
    }

    // 对于没有占位符的情况，直接替换整个文件
    return [
      new vscode.TextEdit(
        new vscode.Range(
          0,
          0,
          Number.MAX_SAFE_INTEGER,
          Number.MAX_SAFE_INTEGER
        ),
        newCode
      ),
    ];
  }

  // Modified createSmartEdits to generate specific edits rather than a full file replacement
  private createSmartEdits(
    originalContent: string,
    newCodeWithPlaceholders: string
  ): vscode.TextEdit[] {
    // Split into segments
    const segments = newCodeWithPlaceholders.split("// ...existing code...");
    if (segments.length <= 1) {
      // No placeholders, direct replacement
      return [
        new vscode.TextEdit(
          new vscode.Range(
            0,
            0,
            Number.MAX_SAFE_INTEGER,
            Number.MAX_SAFE_INTEGER
          ),
          newCodeWithPlaceholders
        ),
      ];
    }

    // Split original content into lines
    const originalLines = originalContent.split("\n");
    const edits: vscode.TextEdit[] = [];
    let lastPosition = 0;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i].trim();
      if (!segment) {continue;}

      const segmentLines = segment.split("\n");

      // Find the best match position for this segment in the original file
      const matchResult = this.findBestMatchPositionWithDiff(
        originalLines,
        segmentLines,
        lastPosition
      );

      if (matchResult.position >= 0) {
        // Create a targeted edit for matched position
        const startPosition = new vscode.Position(matchResult.position, 0);
        const endPosition = new vscode.Position(
          matchResult.position + matchResult.matchedLines,
          originalLines[matchResult.position + matchResult.matchedLines - 1]
            ?.length || 0
        );
        const range = new vscode.Range(startPosition, endPosition);

        edits.push(new vscode.TextEdit(range, segmentLines.join("\n")));

        // Update last position for next search
        lastPosition = matchResult.position + segmentLines.length;
      } else if (i === 0) {
        // First segment not found, place at the beginning
        edits.push(
          new vscode.TextEdit(
            new vscode.Range(0, 0, 0, 0),
            segmentLines.join("\n") + "\n"
          )
        );
        lastPosition = segmentLines.length;
      } else if (i === segments.length - 1) {
        // Last segment not found, place at the end
        const lastLine = originalLines.length - 1;
        const lastCol = originalLines[lastLine]?.length || 0;
        edits.push(
          new vscode.TextEdit(
            new vscode.Range(lastLine, lastCol, lastLine, lastCol),
            "\n" + segmentLines.join("\n")
          )
        );
      } else {
        // Middle segment not found, place after last position
        const posLine = Math.min(lastPosition, originalLines.length - 1);
        const posCol = originalLines[posLine]?.length || 0;
        edits.push(
          new vscode.TextEdit(
            new vscode.Range(posLine, posCol, posLine, posCol),
            "\n" + segmentLines.join("\n")
          )
        );
        lastPosition += segmentLines.length;
      }
    }

    return edits;
  }

  private findBestMatchPositionWithDiff(
    originalLines: string[],
    segmentLines: string[],
    startPos: number = 0
  ): { position: number; matchedLines: number } {
    if (segmentLines.length === 0) {
      return { position: -1, matchedLines: 0 };
    }

    // 过滤掉空行
    const nonEmptySegmentLines = segmentLines.filter(
      (line) => line.trim().length > 0
    );
    if (nonEmptySegmentLines.length === 0) {
      return { position: -1, matchedLines: 0 };
    }

    let bestMatchPosition = -1;
    let bestMatchScore = -1;
    let bestMatchLines = 0;

    // 将原始文件从startPos开始的部分连接成一个字符串
    const originalText = originalLines.slice(startPos).join("\n");
    const segmentText = nonEmptySegmentLines.join("\n");

    // 使用diff库计算差异
    const changes = diff.diffLines(originalText, segmentText);

    // 寻找最佳匹配位置
    for (
      let i = startPos;
      i < originalLines.length - nonEmptySegmentLines.length + 1;
      i++
    ) {
      // 从当前位置提取与段落等长的文本
      const windowText = originalLines
        .slice(i, i + nonEmptySegmentLines.length)
        .join("\n");

      // 计算窗口文本与段落的差异
      const windowChanges = diff.diffLines(windowText, segmentText);

      // 计算相似度分数
      const similarity = this.calculateBlockSimilarity(windowChanges);
      const score = similarity * nonEmptySegmentLines.length;

      // 更新最佳匹配
      if (score > bestMatchScore) {
        bestMatchScore = score;
        bestMatchPosition = i;

        // 计算匹配行数
        const matchedLines = this.countMatchedLines(windowChanges);
        bestMatchLines = matchedLines;
      }
    }

    // 至少要求25%的行匹配或至少有2行匹配
    const minRequiredMatches = Math.max(
      2,
      Math.ceil(nonEmptySegmentLines.length * 0.25)
    );

    if (bestMatchScore > 0 && bestMatchLines >= minRequiredMatches) {
      return { position: bestMatchPosition, matchedLines: bestMatchLines };
    }

    return { position: -1, matchedLines: 0 };
  }

  // 计算两个文本块的相似度
  private calculateBlockSimilarity(changes: diff.Change[]): number {
    let totalLength = 0;
    let unchangedLength = 0;

    for (const change of changes) {
      totalLength += change.value.length;
      if (!change.added && !change.removed) {
        unchangedLength += change.value.length;
      }
    }

    return totalLength > 0 ? unchangedLength / totalLength : 0;
  }

  // 计算匹配的行数
  private countMatchedLines(changes: diff.Change[]): number {
    let matchedLines = 0;

    for (const change of changes) {
      if (!change.added && !change.removed) {
        // 计算未修改部分的行数
        matchedLines +=
          change.value.split("\n").length -
          (change.value.endsWith("\n") ? 1 : 0);
      }
    }

    return matchedLines;
  }
}
