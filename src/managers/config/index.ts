import { ConnectionOptions } from 'typeorm';
import { EventEmitter } from 'events';
import { Dirent, existsSync } from 'fs';
import { readdir, readFile } from 'fs/promises';
import { join, normalize, sep } from 'path';

import { IConfig } from './interfaces';
import { BaseManagedFile } from '../../structures/file';

/**
 * Helper class for managing the configuration file
 */
export class ConfigManager extends BaseManagedFile
{
  /** Path leading to the root of the package */
  public readonly rootDirectory: string;

  /** Options supplied by a configuration file (.akitaneru.js) */
  public readonly options: IConfig;

  /**
   * Creates a configuration manager
   * @param {IConfig} [options] - The framework's configuration.
   * @param {string} [filePath] - The absolute path of the file, used when extending the class.
   */
  constructor (options?: IConfig, filePath?: string)
  {
    super(filePath ? filePath : __filename);

    this.rootDirectory = this.getUserRootDirectory();

    this.options = { ...this.getConfigFile(), ...options };

    // Check if there are any internal emitters pre-set.
    if (!this.options._emitters) this.options._emitters = new Map();

    if (options && options.emitters) this.addEmitter(options.emitters);
  }

  public async init (): Promise<void>
  {
    // Check the validity of the configuration
    await this.isValidConfiguration();
  }

  /** Gets the absolute path of the root of the framework. */
  public get akitaNeruRoot (): string
  {
    return join(__dirname, '..', '..');
  }

  /** Gets the project's root directory */
  public get projectRootDirectory (): string
  {
    const packageConfig = require(join(this.rootDirectory, 'package.json'));

    if (!packageConfig.main) throw new Error("'package.json' has no 'main' property.");

    // Removes the file name to extract the root directory of the project.
    return join(this.rootDirectory, packageConfig.main).replace(/\/\w+\.?\w*$/, '');
  }

  public addEmitter (emitters: { [key: string]: EventEmitter }): void
  {
    for (const [key, emitter] of Object.entries(emitters))
    {
      if (!(emitter instanceof EventEmitter)) throw new Error(`'${key}' does not has an 'EventEmitter' as value.`);

      this.options._emitters!.set(key, emitter);
    }
  }

  public static configure (config: IConfig): IConfig
  {
    return config;
  }

  /** Get the root of the project using the framework's configuration file */
  private getUserRootDirectory (): string
  {
    let processDir = process.cwd();

    while (processDir.length && processDir[processDir.length - 1] !== sep)
    {
      if (existsSync(join(processDir, 'package.json'))) return processDir;

      processDir = normalize(join(processDir, '..'));
    }

    throw new Error("Could not find the package root including a 'package.json'.");
  }

  /** Gets the configuration file of the application */
  private getConfigFile (): IConfig
  {
    const configFilePath = join(this.rootDirectory, '.akitaneru.js');

    if (!existsSync(configFilePath)) throw new Error("No configuration file ('.akitaneru.js') found.");

    return require(configFilePath);
  }

  /** Fetches the token of the application if it's not supplied in the configuration file */
  private async fetchRootFile (fileName: string, errorMessage: string): Promise<string>
  {
    const filePath = join(this.rootDirectory, fileName);

    if (!existsSync(filePath))
    {
      throw new Error(errorMessage);
    }

    const file = await readFile(filePath, 'utf8');

    return file.trim();
  }

  /** Fetches the ormconfig if there's any */
  private async fetchORMConfig (): Promise<ConnectionOptions>
  {
    const dirents: Dirent[] = await readdir(this.rootDirectory, { withFileTypes: true });

    const ormConfig = dirents.find(dirent => /^ormconfig/.test(dirent.name) && dirent.isFile());

    return ormConfig ? require(join(this.rootDirectory, ormConfig.name)) : {};
  }

  /**
   * Checks the validity of the configuration file
   * TODO: Use TypeScript type comparasion shenenigans to validate the file instead
   */
  private async isValidConfiguration (): Promise<boolean>
  {
    // Check if the client is configured and if there's a token,
    // defaults to searching for a token file otherwise.
    if (!this.options.client || !this.options.client.token)
    {
      this.options.client = {
        token: await this.fetchRootFile('.token', 'There is no token file or token configured for this application.'),
      };
    }

    // Check if there is a configuration for commands, if not, leave them enabled.
    if (!this.options.commands) this.options.commands = { disabled: false, messages: { }, prefix: ['-'] };
    if (!this.options.commands.messages) this.options.commands.messages = { };
    if (!this.options.commands.prefix) this.options.commands.prefix = ['-']; // Set default prefix if there's none.

    // Check if the database is configured. Use the .ormconfig if present.
    if (!this.options.database) this.options.database = { disabled: false };
    if (!this.options.database.options) this.options.database.options = await this.fetchORMConfig();

    if (!this.options.developers) throw new Error('No developer IDs are present in the configuration.');

    // Check whether the directories were passed or not.
    if (!this.options.directories) this.options.directories = {};

    return true;
  }
}
