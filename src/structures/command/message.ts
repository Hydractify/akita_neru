import { Message } from 'discord.js';

import CommandEntry from '../../builtin/entities/CommandEntries';
import { AkitaNeru } from '../../managers/framework';
import { BaseCommand } from './base';
import { ICommandAsserts, ICommandOptions } from './interfaces';

/** The abstract class for creating message commands */
export abstract class MessageCommand extends BaseCommand
{
  constructor (akita: AkitaNeru, filename: string, options: ICommandOptions)
  {
    super(akita, filename, options);
  }

  /**
   * This is called whenever a command is validated and ready to run. This will parse/set data for running commands.
   * @param {Message} message
   * @param {CommandEntry} entry - The command entry data within the database.
   * @param {ICommandAsserts} asserts - The parsed message with valuable data such as the user's arguments for commands.
   */
  public async execute (message: Message, entry: CommandEntry, asserts: ICommandAsserts): Promise<void>
  {
    this.entry = entry;

    return this.callback(message, asserts);
  }
}
