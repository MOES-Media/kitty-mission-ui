import type { RetryLoadDetail } from './wp-retry.js';

type Member<T extends RetryLoadDetail['target']> = Extract<RetryLoadDetail, { target: T }>;

/** The retry of one entry, keyed by the host's entry key; null (no key) makes the control inert, and it is not drawn. */
export function projectRetryDetail(entry: { key: string }): Member<'project'> | null {
  const key: unknown = entry.key;
  return typeof key === 'string' && key !== '' ? { target: 'project', key } : null;
}

/** The retry of the whole list. */
export function projectsRetryDetail(): Member<'projects'> {
  return { target: 'projects' };
}

/** The retry of the dialog's folder listing. */
export function foldersRetryDetail(): Member<'folders'> {
  return { target: 'folders' };
}
