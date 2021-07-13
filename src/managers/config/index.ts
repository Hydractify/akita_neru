import { ConnectionOptions } from 'typeorm';
import { Dirent, existsSync } from 'fs';
import { EventEmitter } from 'events';
import { TranscodeEncoding } from 'buffer';
import { join, normalize, sep } from 'path';
import { readdir, readFile } from 'fs/promises';

import { BaseManagedFile } from '../../structures/file';
import { ChannelType } from '../../structures/command/enums';
import { IConfig } from './interfaces';

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

  /**
   * Gets the absolute path of the root of the framework.
   * @returns {string}
   */
  public get akitaNeruRoot (): string
  {
    return join(__dirname, '..', '..');
  }

  /**
   * Gets the user's project root directory
   * @returns {string}
   */
  public get projectRootDirectory (): string
  {
    const packageConfig = require(join(this.rootDirectory, 'package.json'));

    if (!packageConfig.main) throw new Error("'package.json' has no 'main' property.");

    // Removes the file name to extract the root directory of the project.
    return join(this.rootDirectory, packageConfig.main).replace(/\/\w+\.?\w*$/, '');
  }

  /** Adds an emitter to the internal emitters */
  public addEmitter (emitters: { [key: string]: EventEmitter }): void
  {
    for (const [key, emitter] of Object.entries(emitters))
    {
      if (!(emitter instanceof EventEmitter)) throw new Error(`'${key}' does not has an 'EventEmitter' as value.`);

      this.options._emitters!.set(key, emitter);
    }
  }

  /**
   * The only purpose of this method is to have auto-completion within .akitaneru.js files
   * @param {IConfig} config - The framework's configuration schema.
   * @returns {IConfig}
   */
  public static configure (config: IConfig): IConfig
  {
    return config;
  }

  /**
   * Gets the root of the project using the framework's configuration file
   * @returns {string}
   */
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

  /**
   * Gets the configuration file of the application
   * @returns {IConfig}
   */
  private getConfigFile (): IConfig
  {
    const configFilePath = join(this.rootDirectory, '.akitaneru.js');

    if (!existsSync(configFilePath)) throw new Error("No configuration file ('.akitaneru.js') found.");

    return require(configFilePath);
  }

  /**
   * Fetches the token of the application if it's not supplied in the configuration file
   * @returns {string}
   */
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

  /**
   * Fetches the ormconfig if there's any
   * @returns {ConnectionOptions}
   */
  private async fetchORMConfig (): Promise<ConnectionOptions>
  {
    const dirents: Dirent[] = await readdir(this.rootDirectory, { withFileTypes: true });

    const ormConfig = dirents.find(dirent => /^ormconfig/.test(dirent.name) && dirent.isFile());

    return ormConfig ? require(join(this.rootDirectory, ormConfig.name)) : {};
  }

  /**
   * Checks the validity of the configuration file
   * TODO: Use TypeScript type comparasion shenenigans to validate the file instead
   * @returns {boolean}
   */
  private async isValidConfiguration (): Promise<boolean>
  {
    // Check if the client is properly configured.
    await this.handleClientValidation();

    // Check if the command manager is properly configured.
    this.handleCommandValidation();

    // Check if the database manager is properly configured.
    await this.handleDatabaseValidation();

    // Check if the event manager is properly configured.
    this.handleEventValidation();

    // Verify whether there are any developer IDs configured, this is required to limit the use of commands such as 'eval'.
    if (!this.options.developerIDs) throw new Error('No developer IDs are present in the configuration.');

    return true;
  }

  /**
   * Handles the basic validation of the 'discord.js' client
   * @returns {boolean}
   */
  private async handleClientValidation (): Promise<void>
  {
    // The application will not start without proper client options, so the framework shouldn't too.
    if (!this.options.client || !this.options.client.options) throw new Error('.akitaneru.js is missing Client options.');

    // If there is no token configured in '.akitaneru.js' then check if there is a '.token' file.
    if (!this.options.client.token)
    {
      this.options.client.token = await this.fetchRootFile('.token', 'There is no token file or token configured for this application.');
    }
  }

  /**
   * Handles the basic validation of the command handler.
   * @return {boolean}
   */
  private handleCommandValidation (): void
  {
    const defaults = {
      customIdEncoding: 'utf8' as TranscodeEncoding,
      defaultOptions: {
        name: '',
        description: '',
        channelType: ChannelType.GUILD,
        cooldown: 5000, // 5 seconds.
      },
      directory: join(this.projectRootDirectory, 'commands'),
      prefix: ['-'],
    };

    // If there isn't any configuration set for commands, set basic defaults;
    if (!this.options.commands) this.options.commands = defaults;

    // Set a default character encoding for custom ids in interactions.
    if (!this.options.commands.customIdEncoding) this.options.commands.customIdEncoding = defaults.customIdEncoding;

    // Set default options for new commands if there are none.
    if (!this.options.commands.defaultOptions) this.options.commands.defaultOptions = defaults.defaultOptions;

    // Set a default directory for commands if there is none.
    if (!this.options.commands.directory) this.options.commands.directory = defaults.directory;

    // Set a default prefix if there are none.
    if (!this.options.commands.prefix) this.options.commands.prefix = defaults.prefix;
  }

  private async handleDatabaseValidation (): Promise<void>
  {
    const ormConfig = await this.fetchORMConfig();
    const defaults = {
      entitiesDirectory: join(this.projectRootDirectory, 'entities'),
      options: ormConfig,
    };

    // If there is an 'ormconfig.x' file present, check whether there is anything within it.
    if (!this.options.database && Object.keys(ormConfig).length) this.options.database = defaults;

    // Enforce the use of a database by not allowing the application to start without configuring TypeORM.
    if (!this.options.database || !this.options.database.options) throw new Error('.akitaneru.js is missing Database options.');

    // Set a default directory for entities if there is none.
    if (!this.options.database.entitiesDirectory) this.options.database.entitiesDirectory = defaults.entitiesDirectory;
  }

  private handleEventValidation (): void
  {
    const defaults = {
      directory: join(this.projectRootDirectory, 'events'),
    };

    // Check if there's any configuration set for the event manager.
    if (!this.options.events) this.options.events = defaults;

    // If there's no directory set for events, set a default.
    if (!this.options.events.directory) this.options.events.directory = defaults.directory;
  }
}
