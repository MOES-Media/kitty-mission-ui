// The options of the shell (contracts/shell-api.md "ShellOptions"): the controller's options without the flush hook, which
// the view alone supplies (FS-03). Declared here because no non-Svelte module of WP03 or WP04 exports the type.
import type { ShellControllerOptions } from '../controller/shell-controller';

export type ShellOptions = Omit<ShellControllerOptions, 'afterRender'>;
