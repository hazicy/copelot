import type { Uri } from "vscode";
import type { ALL_BRACKETS } from "./constants";

export type Bracket = (typeof ALL_BRACKETS)[number];

export interface FimPromptTemplate {
  context: string;
  header: string;
  prefixSuffix: PrefixSuffix;
  fileContextEnabled: boolean;
  language?: string;
}

export interface PrefixSuffix {
  prefix: string;
  suffix: string;
}

export interface RepositoryLevelData {
  uri: Uri;
  text: string;
  name: string;
  isOpen: boolean;
  relevanceScore: number;
}
