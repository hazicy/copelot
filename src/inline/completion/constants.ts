export const STOP_LLAMA = ["<EOT>"];

export const STOP_DEEPSEEK = [
  "<｜fim▁begin｜>",
  "<｜fim▁hole｜>",
  "<｜fim▁end｜>",
  "<END>",
  "<｜end▁of▁sentence｜>",
];

export const STOP_STARCODER = [
  "<|endoftext|>",
  "<file_sep>",
  "<file_sep>",
  "<fim_prefix>",
  "<repo_name>",
];

export const STOP_QWEN = [
  "<|endoftext|>",
  "<|file_sep|>",
  "<|fim_prefix|>",
  "<|im_end|>",
  "<|im_start|>",
  "<|repo_name|>",
  "<|fim_pad|>",
  "<|cursor|>",
];

export const STOP_CODEGEMMA = [
  "<|file_separator|>",
  "<|end_of_turn|>",
  "<eos>",
];

export const STOP_CODESTRAL = ["[PREFIX]", "[SUFFIX]"];

export const FIM_TEMPLATE_FORMAT = {
  automatic: "automatic",
  codegemma: "codegemma",
  codellama: "codellama",
  codeqwen: "codeqwen",
  codestral: "codestral",
  custom: "custom-template",
  deepseek: "deepseek",
  llama: "llama",
  stableCode: "stable-code",
  starcoder: "starcoder",
};


export const stopSequencesMap: Record<string, string[]> = {
  [FIM_TEMPLATE_FORMAT.codellama]: STOP_LLAMA,
  [FIM_TEMPLATE_FORMAT.llama]: STOP_LLAMA,
  [FIM_TEMPLATE_FORMAT.deepseek]: STOP_DEEPSEEK,
  [FIM_TEMPLATE_FORMAT.stableCode]: STOP_STARCODER,
  [FIM_TEMPLATE_FORMAT.starcoder]: STOP_STARCODER,
  [FIM_TEMPLATE_FORMAT.codeqwen]: STOP_QWEN,
  [FIM_TEMPLATE_FORMAT.codegemma]: STOP_CODEGEMMA,
  [FIM_TEMPLATE_FORMAT.codestral]: STOP_CODESTRAL,
};


