/** The callback through which BindingHarness hands every intent of the screen to its caller: the event name and its detail. */
export type OnIntent = (name: string, detail: unknown) => void;

/** The part of an intent event a handler reads. A `CustomEvent<T>` of the screen is assignable to it. */
export interface IntentEvent<T> {
  readonly detail: T;
}
