export const pseudocodeGrammar = {
  displayName: "Pseudocode",
  name: "pseudocode",
  scopeName: "source.pseudocode",
  repository: {},
  patterns: [
    { begin: '"', end: '"', name: "string.quoted.double.pseudocode" },
    {
      match: "\\b(function|if|require|return|reject|is|or|and)\\b",
      name: "keyword.control.pseudocode",
    },
    { match: "\\b[0-9]+\\b", name: "constant.numeric.pseudocode" },
    { match: "\\babsent\\b", name: "constant.language.pseudocode" },
  ],
};
