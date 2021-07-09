import { Collection } from 'discord.js';
import { join } from 'path';

import { AkitaNeru } from '../framework';
import { BaseCommand, InteractionCommand, MessageCommand } from '../../structures/command';
import { BaseManager } from '../../structures/manager';
import { ConfigManager } from '../../managers/config';
import { CommandResolver } from '../../structures/command/resolver';

/**
 * Class for managing commands set up by the user
 */
export class CommandManager extends BaseManager
{
  public interactions: Collection<string, InteractionCommand>;

  public messages: Collection<string, MessageCommand>;

  public resolver: CommandResolver;

  /**
   * Config manager used by the framework
   */
  protected config: ConfigManager;

  protected files: BaseCommand[] = [];

  protected framework: AkitaNeru;

  /**
   * Creates a command manager
   */
  constructor (akita: AkitaNeru)
  {
    super(__filename);

    this.framework = akita;
    this.config = akita.config;
    this.resolver = new CommandResolver(this, akita.config);

    this.interactions = new Collection();
    this.messages = new Collection();
  }

  public async init (): Promise<void>
  {
    const messageCommands = [
      ...await this.fetchBuiltInCommands('MessageCommand'),
      ...await this.fetchUserCommands('MessageCommand'),
    ] as MessageCommand[];
    messageCommands.forEach(command => this.messages.set(command.options.name, command));

    const interactionCommands = [
      ...await this.fetchBuiltInCommands('InteractionCommand'),
      ...await this.fetchUserCommands('InteractionCommand'),
    ] as InteractionCommand[];
    interactionCommands.forEach(command => this.interactions.set(command.options.name, command));

    this.files = [...messageCommands, ...interactionCommands];
  }

  public async refresh (): Promise<void>
  {
    this.files.forEach(command => command.reload());
    this.files = [];

    await this.init();
  }

  public async setInteractions (): Promise<void>
  {
    const commands = await this.framework.client.application?.commands.fetch();

    for (const localCommand of this.interactions.values())
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
    const commandsToDelete = commands?.filter(command => this.interactions.get(command.name) ? false : true);
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
