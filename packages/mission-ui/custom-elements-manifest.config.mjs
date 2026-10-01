// Analyzer config for the element manifest gate (FR-011).
// packagejson:false keeps the analyzer from writing a `customElements` field into package.json,
// so generating the manifest never mutates tracked files other than custom-elements.json.
export default {
  globs: ['src/elements/**/*.ts', 'src/screens/**/*.ts'],
  exclude: ['**/*.stories.ts', '**/fixtures.ts'],
  outdir: '.',
  litelement: true,
  packagejson: false,
};
