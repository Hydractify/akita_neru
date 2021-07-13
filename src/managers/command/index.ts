import { Collection } from 'discord.js';
import { join } from 'path';

import { AkitaNeru } from '../framework';
import { BaseCommand, ComponentCommand, SlashCommand, MessageCommand } from '../../structures/command';
import { BaseManager } from '../../structures/manager';
import { Client } from '../../structures/client';
import { CommandHandler } from './handler';
import { CommandResolver } from '../../structures/command/resolver';
import { ConfigManager } from '../../managers/config';

/**
 * Class for managing commands set up by the user
 */
export class CommandManager extends BaseManager
{
  public handler: CommandHandler;

  public resolver: CommandResolver;

  public components: Collection<string, ComponentCommand>;

  public messages: Collection<string, MessageCommand>;

  public slashes: Collection<string, SlashCommand>;


  /**
   * Config manager used by the framework
   */
  protected config: ConfigManager;

  protected files: BaseCommand[] = [];

  protected framework: AkitaNeru;

  /**
   * Creates a command manager
   */
  constructor (akita: AkitaNeru, client: Client)
  {
    super(__filename);

    this.framework = akita;
    this.config = akita.config;
    this.resolver = new CommandResolver(this, akita.config);
    this.handler = new CommandHandler(akita, client);

    this.components = new Collection();
    this.messages = new Collection();
    this.slashes = new Collection();
  }

  public async init (): Promise<void>
  {
    const componentCommands = [
      ...await this.fetchBuiltInCommands('ComponentCommand'),
      ...await this.fetchUserCommands('ComponentCommand'),
    ] as ComponentCommand[];
    componentCommands.forEach(command => this.components.set(command.options.name, command));

    const messageCommands = [
      ...await this.fetchBuiltInCommands('MessageCommand'),
      ...await this.fetchUserCommands('MessageCommand'),
    ] as MessageCommand[];
    messageCommands.forEach(command => this.messages.set(command.options.name, command));

    const slashCommands = [
      ...await this.fetchBuiltInCommands('SlashCommand'),
      ...await this.fetchUserCommands('SlashCommand'),
    ] as SlashCommand[];
    slashCommands.forEach(command => this.slashes.set(command.options.name, command));

    this.files = [...componentCommands, ...messageCommands, ...slashCommands];
  }

  public async setSlashCommands (): Promise<void>
  {
    const commands = await this.framework.client.application?.commands.fetch();

    for (const localCommand of this.slashes.values())
    {
      const command = commands ? commands.find(command => command.name === localCommand.options.name) : null;
      if (!command)
      {
        await this.framework.client.application?.commands.create(localCommand.commandData);

        continue;
      }

      // FIXME Check if there's any difference, if so, update.
      // await this.framework.client.application?.commands.edit(command, localCommand.commandData);
    }

    // Filter out commands that exist locally.
    const commandsToDelete = commands?.filter(command => this.slashes.get(command.name) ? false : true);
    if (!commandsToDelete) return;

    for (const command of commandsToDelete.values())
    {
      await this.framework.client.application?.commands.delete(command);
    }
  }

  private get commandsDirectory (): string
  {
    return this.config.options.commands.directory;
  }

  private async fetchBuiltInCommands (moduleName: string): Promise<BaseCommand[]>
  {
    return await this.fetchDirectoryFiles(join(this.config.akitaNeruRoot, 'builtin', 'commands'), {
      exportedModuleNames: [moduleName],
      constructorArguments: [this.framework],
    }) as BaseCommand[];
  }

  private async fetchUserCommands (moduleName: string): Promise<BaseCommand[]>
  {
    return await this.fetchDirectoryFiles(this.commandsDirectory, {
      exportedModuleNames: [moduleName],
      constructorArguments: [this.framework],
    }) as BaseCommand[];
  }
}
