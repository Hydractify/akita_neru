import { join } from 'path';
import { Dirent, existsSync } from 'fs';
import { readdir } from 'fs/promises';

import { BaseManagedFile } from '../file';

/**
 * Base class for creating managers, these can dynamically load and reload files for the framework.
 */
export abstract class BaseManager extends BaseManagedFile
{
  /** All the loaded files of the manager */
  protected abstract files: BaseManagedFile[];

  /**
   * @param {string} filePath - The absolute path of the current file.
   */
  constructor (filePath: string)
  {
    super(filePath);
  }

  /**
   * Called to start the processes needed for the manager. i.e. fetch managed files.
   */
  public abstract init (): Promise<void> | void;

  /**
   * "Reloads" all managed files.
   * This removes each file from the cache and Node will re-load them once they're required again.
   */
  public async reloadAllFiles (): Promise<void>
  {
    this.files.forEach(file => file.reload());
    this.files = [];

    await this.init();
  }

  /**
   * Fetches all files in a given directory, returning the required files found within it.
   * @param {string} directoryPath - The directory to crawl through.
   * @param {Object} options - The options for fetching
   * @param {boolean} [options.shouldUseIndex = true] - Whether index files should be used when a directory has one, ignoring the other files within it.
   * @param {string[]} [options.exportedModuleNames = []] - The exported module names that you want to required.
   * @param {Object[]} [options.constructorArguments = []] - The arguments passed to the constructor of required files.
   * @returns {BaseManagedFile[]}
   */
  protected async fetchDirectoryFiles (
    directoryPath: string,
    {
      shouldUseIndex = true,
      exportedModuleNames = [],
      constructorArguments = [],
    }:
    {
      shouldUseIndex?: boolean,
      exportedModuleNames?: string[],
      constructorArguments?: any[], // eslint-disable-line @typescript-eslint/no-explicit-any
    },
  ): Promise<BaseManagedFile[]>
  {
    if (!existsSync(directoryPath)) return [];

    const dirents: Dirent[] = await readdir(directoryPath, { withFileTypes: true });

    const indexFile: Dirent | undefined = shouldUseIndex
      ? dirents.find(dirent => dirent.name === 'index.js' && dirent.isFile())
      : undefined;

    const files: (BaseManagedFile | null)[] = indexFile
      ? [this.requireFile(directoryPath, indexFile.name, exportedModuleNames, constructorArguments)]
      : dirents
        .filter(dirent => dirent.isFile() && /\.js$/.test(dirent.name))
        .map(dirent => this.requireFile(directoryPath, dirent.name, exportedModuleNames, constructorArguments))
        .filter(file => Boolean(file));

    const subDirectories: BaseManagedFile[][] = await Promise.all(
      dirents
        .filter(dirent => dirent.isDirectory())
        .map(dirent => this.fetchDirectoryFiles(join(directoryPath, dirent.name), { shouldUseIndex, exportedModuleNames })),
    );

    // 20 is the highest number recognised by TypeScript for flattening an Array.
    return files.concat(subDirectories.flat(20)) as BaseManagedFile[];
  }

  /**
   * @param {string} directoryPath - The directory that contains the file being required.
   * @param {string} fileName - The name of the file being required.
   * @param {string[]} moduleNames - The names of the modules wanted to be required.
   * @param {string[]} constructorArguments - The arguments passed to the constructor of required files.
   * @returns {BaseManagedFile}
   */
  private requireFile (
    directoryPath: string,
    fileName: string,
    moduleNames: string[],
    constructorArguments: any[], // eslint-disable-line @typescript-eslint/no-explicit-any
  ): BaseManagedFile | null
  {
    const file = require(join(directoryPath, fileName));

    const moduleName = file && moduleNames.find(moduleName => file[moduleName]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const managedClass: new (...args: any[]) => BaseManagedFile = moduleName
      ? file[moduleName]
      : file;

    const managedFile = typeof managedClass === 'function'
      ? new managedClass(...constructorArguments)
      : null;

    return managedFile instanceof BaseManagedFile ? managedFile : null;
  }
}
