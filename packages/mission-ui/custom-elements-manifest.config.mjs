// Analyzer config for the element manifest gate (FR-011).
// packagejson:false keeps the analyzer from writing a `customElements` field into package.json,
// so generating the manifest never mutates tracked files other than custom-elements.json.
// The analyzer collects modules from a concurrent glob walk, so their order varies between runs; sort by path so the
// manifest is byte-reproducible (the manifest gate compares bytes).
// The manifest records only the public element surface (properties, events, slots, parts): private and protected
// members, Lit plumbing statics and non-element exports are implementation detail, so adding them never drifts it.
const LIT_PLUMBING = new Set(['shadowRootOptions', 'styles']);

const sortModules = {
  name: 'sort-modules-by-path',
  packageLinkPhase({ customElementsManifest }) {
    for (const mod of customElementsManifest.modules) {
      mod.declarations = (mod.declarations ?? []).filter((d) => d.customElement === true);
      for (const d of mod.declarations) {
        d.members = (d.members ?? []).filter(
          (m) => m.privacy !== 'private' && m.privacy !== 'protected' && !(m.static === true && LIT_PLUMBING.has(m.name)),
        );
      }
      const kept = new Set(mod.declarations.map((d) => d.name));
      mod.exports = (mod.exports ?? []).filter((e) => e.kind === 'custom-element-definition' || kept.has(e.declaration?.name));
    }
    customElementsManifest.modules.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  },
};

export default {
  globs: ['src/elements/**/*.ts', 'src/screens/**/*.ts'],
  exclude: ['**/*.stories.ts', '**/fixtures.ts'],
  outdir: '.',
  litelement: true,
  packagejson: false,
  plugins: [sortModules],
};
