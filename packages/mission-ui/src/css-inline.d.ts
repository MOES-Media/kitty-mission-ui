// Vite's `?inline` suffix returns the stylesheet text.
declare module '*.css?inline' {
  const text: string;
  export default text;
}
