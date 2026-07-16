export const abnfGrammar = {
  displayName: "ABNF",
  name: "abnf",
  scopeName: "source.abnf",
  fileTypes: ["abnf"],
  patterns: [
    { include: "#comments" },
    { include: "#rule-definition" },
    { include: "#case-sensitive-string" },
    { include: "#case-insensitive-string" },
    { include: "#quoted-string" },
    { include: "#numeric-value" },
    { include: "#prose-value" },
    { include: "#repetition" },
    { include: "#core-rule" },
    { include: "#alternation" },
    { include: "#grouping" },
    { include: "#rule-reference" },
  ],
  repository: {
    comments: {
      begin: ";",
      beginCaptures: {
        "0": { name: "punctuation.definition.comment.abnf" },
      },
      end: "$",
      name: "comment.line.semicolon.abnf",
    },
    "rule-definition": {
      captures: {
        "1": { name: "entity.name.function.rule.abnf" },
        "2": { name: "keyword.operator.assignment.abnf" },
      },
      match: "^([A-Za-z][A-Za-z0-9-]*)[ \\t]*(=/|=)",
      name: "meta.rule.definition.abnf",
    },
    "case-sensitive-string": {
      begin: '(%[sS])(")',
      beginCaptures: {
        "1": { name: "storage.modifier.case-sensitive.abnf" },
        "2": { name: "punctuation.definition.string.begin.abnf" },
      },
      end: '"',
      endCaptures: {
        "0": { name: "punctuation.definition.string.end.abnf" },
      },
      name: "string.quoted.double.case-sensitive.abnf",
    },
    "case-insensitive-string": {
      begin: '(%[iI])(")',
      beginCaptures: {
        "1": { name: "storage.modifier.case-insensitive.abnf" },
        "2": { name: "punctuation.definition.string.begin.abnf" },
      },
      end: '"',
      endCaptures: {
        "0": { name: "punctuation.definition.string.end.abnf" },
      },
      name: "string.quoted.double.case-insensitive.abnf",
    },
    "quoted-string": {
      begin: '"',
      beginCaptures: {
        "0": { name: "punctuation.definition.string.begin.abnf" },
      },
      end: '"',
      endCaptures: {
        "0": { name: "punctuation.definition.string.end.abnf" },
      },
      name: "string.quoted.double.case-insensitive.abnf",
    },
    "numeric-value": {
      match:
        "%[bB][01]+(?:-[01]+|(?:\\.[01]+)+)?|%[dD][0-9]+(?:-[0-9]+|(?:\\.[0-9]+)+)?|%[xX][0-9A-Fa-f]+(?:-[0-9A-Fa-f]+|(?:\\.[0-9A-Fa-f]+)+)?",
      name: "constant.numeric.abnf",
    },
    "prose-value": {
      begin: "<",
      beginCaptures: {
        "0": { name: "punctuation.definition.string.begin.abnf" },
      },
      end: ">",
      endCaptures: {
        "0": { name: "punctuation.definition.string.end.abnf" },
      },
      name: "string.unquoted.prose.abnf",
    },
    repetition: {
      match:
        '(?<![A-Za-z0-9-])(?:[0-9]*\\*[0-9]*|[0-9]+)(?=[ \\t]*(?:[A-Za-z%"\\[(<]))',
      name: "keyword.operator.quantifier.abnf",
    },
    "core-rule": {
      match:
        "\\b(?i:ALPHA|BIT|CHAR|CR|CRLF|CTL|DIGIT|DQUOTE|HEXDIG|HTAB|LF|LWSP|OCTET|SP|VCHAR|WSP)\\b",
      name: "support.constant.core-rule.abnf",
    },
    alternation: {
      match: "/",
      name: "keyword.operator.alternation.abnf",
    },
    grouping: {
      match: "[()\\[\\]]",
      name: "punctuation.section.group.abnf",
    },
    "rule-reference": {
      match: "\\b[A-Za-z][A-Za-z0-9-]*\\b",
      name: "variable.other.rule-reference.abnf",
    },
  },
};
