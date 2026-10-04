export interface SettleOptions {
  whenDefined: (name: string) => Promise<unknown>;
  timeoutMs: number;
  maxPasses: number;
}
export function settleNested(rootEl: unknown, options: SettleOptions): Promise<number>;
