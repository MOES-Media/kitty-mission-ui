// Synthetic data for the open-project dialog stories and tests (no real path, project or person). Locations are host-opaque
// text under a synthetic `~/work` root.
import type { FolderEntry } from '../../project-types.js';

/** The folder field's text: the folder the listing shows. */
export const LOCATION = '~/work/sample-workspace';

/** The parent row (kind `parent`, never a valid project). */
export const parentFolder: FolderEntry = { name: '..', location: '~/work', kind: 'parent', valid: false };

/** A valid project (carries the "valid project" pill). */
export const validProject: FolderEntry = { name: 'sample-project', location: '~/work/sample-workspace/sample-project', kind: 'folder', valid: true };

/** A second valid project: the pill shows on any valid folder, not only the selected one. */
export const otherValidProject: FolderEntry = { name: 'second-project', location: '~/work/sample-workspace/second-project', kind: 'folder', valid: true };

/** An ordinary folder: not a valid project. */
export const plainFolder: FolderEntry = { name: 'scratch-notes', location: '~/work/sample-workspace/scratch-notes', kind: 'folder', valid: false };

/** A folder whose name cannot break the layout. */
export const longNameFolder: FolderEntry = {
  name: 'a-folder-with-a-very-long-name-that-keeps-going-without-any-break-opportunity-until-it-must-wrap-somewhere',
  location: '~/work/sample-workspace/a-folder-with-a-very-long-name',
  kind: 'folder',
  valid: false,
};

/** PR-20, PR-21: the parent row, a valid project, an ordinary folder. */
export const readyFolders: FolderEntry[] = [parentFolder, validProject, plainFolder];

/** The mix: both kinds of valid project, an ordinary folder and the parent row. */
export const mixedFolders: FolderEntry[] = [parentFolder, validProject, otherValidProject, plainFolder];

/** A listing with a long name. */
export const longNameFolders: FolderEntry[] = [parentFolder, longNameFolder, validProject];

/** An empty listing (the folder holds no folders): the host passes no entries and `status="empty"`. */
export const noFolders: FolderEntry[] = [];
