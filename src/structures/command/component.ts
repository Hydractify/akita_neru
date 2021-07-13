import { Interaction } from 'discord.js';

import CommandEntry from '../../builtin/entities/CommandEntries';
import { AkitaNeru } from '../../managers/framework';
import { BaseCommand } from './base';
import { ICommandAsserts, ICommandOptions } from './interfaces';

/** The abstract class for creating message component commands. */
export abstract class ComponentCommand extends BaseCommand
{
  constructor (akita: AkitaNeru, filename: string, options: ICommandOptions)
  {
    super(akita, filename, options);
  }

  /**
   * This is called whenever a command is validated and ready to run. This will parse/set data for running commands.
   * @param {Interaction} interaction
   * @param {CommandEntry} entry - The command entry data within the database.
   * @param {ICommandAsserts} asserts - The parsed custom id data.
   */
  public execute (interaction: Interaction, entry: CommandEntry, asserts: ICommandAsserts): void
  {
    if (!interaction.isMessageComponent()) return;

    this.entry = entry;

    return this.callback(interaction, asserts);
  }
}
