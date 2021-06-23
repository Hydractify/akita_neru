import { EventEmitter } from 'events';

import { FileEvents } from './enums';

/**
 * Base class for files which are required by managers.
 */
export abstract class BaseManagedFile extends EventEmitter
{
  /** The path for this file */
  private readonly filePath: string;

  /**
   * @param {string} path - The absolute path of the current file (__filename).
   */
  constructor (path: string)
  {
    super();

    this.filePath = path;
  }

  /**
   * "Reloads" the file.
   * This removes the file from the cache and Node will re-load it once it's required again.
   */
  public reload (): void
  {
    delete require.cache[this.filePath];

    this.emit(FileEvents.RELOAD);
  }
}
