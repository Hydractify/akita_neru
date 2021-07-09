import { Client, Interaction, Message } from 'discord.js';

import CommandEntry from '../../builtin/entities/CommandEntries';
import { AkitaNeru } from '../../managers/framework';
import { BaseManagedFile } from '../file';
import { ICommandAsserts, ICommandOptions } from './interfaces';

/** Base command class for creating commands */
export abstract class BaseCommand extends BaseManagedFile
{
  /** The command's options */
  public readonly options: ICommandOptions;

  /** discord.js' client */
  protected readonly client: Client;

  /** Command's log entry in the database, set when being called. */
  protected entry!: CommandEntry;

  /** The framework manager. */
  protected readonly framework: AkitaNeru;

  constructor (akita: AkitaNeru, filename: string, options: ICommandOptions)
  {
    super(filename);

    this.framework = akita;
    this.client = akita.client;

    this.options = { ...akita.config.options.commands.defaultOptions, ...options };
  }

  /**
   * This is called whenever a command is validated and ready to run. This will parse/set data for running commands.
   * @param {(Message | Interaction)} i - The message/interaction coming from the client event.
   * @param {CommandEntry} entry - The command entry data within the database.
   * @param {ICommandAsserts} [asserts] - The parsed message with valuable data such as the user's arguments for commands.
   */
  public abstract execute (i: Message | Interaction, entry: CommandEntry, asserts?: ICommandAsserts): Promise<void> | void;

  /**
   * The callback of the command.
   * @param {(Message | Interaction)} i - The message/interaction coming from the client event.
   * @param {ICommandAsserts} [asserts] - The parsed message with valuable data such as the user's arguments for commands.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected abstract callback (i: Message | Interaction, asserts?: ICommandAsserts): Promise<any> | any;
}
