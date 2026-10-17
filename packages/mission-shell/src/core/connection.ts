// The connection presentation, core half (plan IC-03, FS-06; contracts/connection-presentation.md): state -> condition,
// the refused flag, the 1 s reconnecting grace timer and the copy. No tone, no announce, no markup: the view owns those.
// Time comes only from the injected scheduler.
import type { ConnectionState } from '../client/port';
import type { ShellScheduler } from './scheduler';

/** The conditions a banner can show. The view's tone table has one line per entry. */
export const CONNECTION_CONDITIONS = ['connecting', 'reconnecting', 'service-missing', 'contract-mismatch', 'live-updates-off'] as const;
export type ConnectionCondition = (typeof CONNECTION_CONDITIONS)[number];

/** How long `reconnecting` must last before it is shown (NFR-004, R2-08). */
export const GRACE_MS = 1000;

export interface BannerText {
  readonly title: string;
  readonly body: string;
}

/** The host's overrides of the two degraded explanations (`ShellOptions.copy`). */
export interface ShellCopyOverrides {
  serviceMissing?: BannerText;
  contractMismatch?: BannerText;
}

/** The default copy, verbatim from contracts/connection-presentation.md. One object: a CP-1 amendment is a one-place edit. */
export const SHELL_COPY = {
  banners: {
    connecting: { title: 'Connecting', body: 'Connecting to the Mission Status service.' },
    reconnecting: { title: 'Reconnecting', body: 'The connection was lost. The data shown may be out of date until it is restored.' },
    'service-missing': {
      title: 'Service not available',
      body: 'The Mission Status service could not be found or started. Data that was already loaded stays visible.',
    },
    'contract-mismatch': {
      title: 'Incompatible service',
      body: 'The Mission Status service speaks a different contract version than this app. Data that was already loaded stays visible.',
    },
    'live-updates-off': {
      title: 'Live updates are off',
      body: 'The service refused the change stream. Views are not updated automatically; navigate or refresh to read again.',
    },
  } as const satisfies Record<ConnectionCondition, BannerText>,
  /** The two degraded bodies when no data has been loaded: the loaded-data sentence is dropped (CP-1 A2). */
  degradedWithoutData: {
    'service-missing': { title: 'Service not available', body: 'The Mission Status service could not be found or started.' },
    'contract-mismatch': {
      title: 'Incompatible service',
      body: 'The Mission Status service speaks a different contract version than this app.',
    },
  } as const satisfies Partial<Record<ConnectionCondition, BannerText>>,
  projectEyebrow: 'Project',
  missionNotFound: 'This Mission could not be found. It may have been removed.',
  readFailed: 'The data could not be loaded.',
  chromeError: 'The project could not be loaded.',
  noProjectOpen: 'No project is open.',
  /** The Mission head's back item (the prototype's wording). */
  backToMissions: 'All Missions',
} as const;

/**
 * The title and body of a condition; only the two degraded ones take an override (a host override is shown as given).
 * `dataLoaded` is whether any data is on screen: the two degraded defaults say "Data that was already loaded stays visible."
 * only then (CP-1 A2).
 */
export function bannerCopy(condition: ConnectionCondition, overrides: ShellCopyOverrides = {}, dataLoaded = true): BannerText {
  if (condition === 'service-missing' && overrides.serviceMissing) return overrides.serviceMissing;
  if (condition === 'contract-mismatch' && overrides.contractMismatch) return overrides.contractMismatch;
  if (!dataLoaded && (condition === 'service-missing' || condition === 'contract-mismatch')) return SHELL_COPY.degradedWithoutData[condition];
  return SHELL_COPY.banners[condition];
}

export interface ConnectionPresenterOptions {
  scheduler: ShellScheduler;
  /** The client's state when the presenter is created (the port's `onChange` does not replay it). */
  initial: ConnectionState;
  /** Called after every change of what `condition()` or `state()` returns, including the grace timer firing. */
  onChange: () => void;
}

export interface ConnectionPresenter {
  state(): ConnectionState;
  /** The banner condition, or `null` for no banner. */
  condition(): ConnectionCondition | null;
  refused(): boolean;
  /** A new connection state: updates the state first, then manages the grace timer, then notifies. */
  setState(next: ConnectionState): void;
  /** The subscription was refused: the neutral notice shows whenever no connection condition does. */
  setRefused(): void;
  dispose(): void;
}

/** One presenter per client; `setClient` disposes it and creates the next (the refused flag goes with it). */
export function createConnectionPresenter(options: ConnectionPresenterOptions): ConnectionPresenter {
  const { scheduler, onChange } = options;
  let state: ConnectionState = options.initial;
  let reconnectingShown = false;
  let timer: unknown = null;
  let isRefused = false;

  const clear = (): void => {
    if (timer !== null) scheduler.clearTimeout(timer);
    timer = null;
    reconnectingShown = false;
  };

  /** State first, then the timer (R2-08). */
  const enter = (next: ConnectionState): void => {
    state = next;
    clear();
    if (next === 'reconnecting') {
      timer = scheduler.setTimeout(() => {
        timer = null;
        if (state !== 'reconnecting') return;
        reconnectingShown = true;
        onChange();
      }, GRACE_MS);
    }
  };

  enter(options.initial);

  return {
    state: () => state,
    condition() {
      switch (state) {
        case 'connecting':
          return 'connecting';
        case 'degraded: service-missing':
          return 'service-missing';
        case 'degraded: contract-mismatch':
          return 'contract-mismatch';
        case 'reconnecting':
          if (reconnectingShown) return 'reconnecting';
          return isRefused ? 'live-updates-off' : null;
        case 'connected':
          return isRefused ? 'live-updates-off' : null;
      }
    },
    refused: () => isRefused,
    setState(next) {
      // A repeat of the current state changes nothing: it must not re-arm the grace timer (a shown banner would vanish and
      // return) and has nothing to notify.
      if (next === state) return;
      enter(next);
      onChange();
    },
    setRefused() {
      isRefused = true;
      onChange();
    },
    dispose() {
      clear();
    },
  };
}
