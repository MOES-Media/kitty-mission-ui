// Vite's `?inline` suffix returns the stylesheet text.
declare module '*.css?inline' {
  const text: string;
  export default text;
}

// The `?raw` suffix returns a file's text (the defaults test reads the vendored contract schemas with it).
declare module '*?raw' {
  const text: string;
  export default text;
}
