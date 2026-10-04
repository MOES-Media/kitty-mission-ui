// R-05: waits for every custom element nested in a story (light DOM and shadow roots, at any depth) to finish its
// first render before the shot. Self-contained on purpose: Playwright serialises it into the page, so it may use no
// closure variable, import or module-level helper. Waits only; it captures nothing, so it cannot mask a render diff.
//
// Bounded two ways, so a hung element fails the story loudly instead of stalling until the Playwright test timeout:
//   - each element gets `timeoutMs` to become defined and finish its update (reject, naming the element);
//   - at most `maxPasses` collect passes; if the last pass still found new elements the tree is not stable (reject).
export async function settleNested(rootEl, options) {
  const { whenDefined, timeoutMs, maxPasses } = options;
  const collect = (scope, into) => {
    for (const child of Array.from(scope.querySelectorAll('*'))) {
      if (child.localName.includes('-')) into.add(child);
      if (child.shadowRoot !== null && child.shadowRoot !== undefined) collect(child.shadowRoot, into);
    }
  };
  const within = (promise, label) => {
    let timer;
    const timeout = new Promise((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error(`settle: ${label} did not settle within ${timeoutMs} ms`)), timeoutMs);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
  };
  const settled = new Set();
  let stable = false;
  for (let pass = 0; pass < maxPasses; pass += 1) {
    const found = new Set();
    if (rootEl !== null && rootEl !== undefined) {
      found.add(rootEl);
      if (rootEl.shadowRoot !== null && rootEl.shadowRoot !== undefined) collect(rootEl.shadowRoot, found);
      collect(rootEl, found);
    }
    const fresh = [...found].filter((el) => !settled.has(el));
    if (fresh.length === 0) {
      stable = true;
      break;
    }
    for (const el of fresh) {
      await within(
        Promise.resolve(whenDefined(el.localName)).then(() => el.updateComplete),
        `<${el.localName}>`,
      );
      settled.add(el);
    }
  }
  if (!stable) throw new Error(`settle: still finding new custom elements after ${maxPasses} passes`);
  return settled.size;
}
