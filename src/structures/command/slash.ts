import { ApplicationCommandData, Interaction } from 'discord.js';

import CommandEntry from '../../builtin/entities/CommandEntries';
import { AkitaNeru } from '../../managers/framework';
import { BaseCommand } from './base';
import { ICommandOptions } from './interfaces';

/** The abstract class for creating slash commands. */
export abstract class SlashCommand extends BaseCommand
{
  constructor (akita: AkitaNeru, filename: string, options: ICommandOptions)
  {
    super(akita, filename, options);
  }

  /** Build the data required to register a slash command. */
  public get commandData (): ApplicationCommandData
  {
    const data: ApplicationCommandData = {
      name: this.options.name,
      description: this.options.description,
    };

    if (this.options.defaultPermission) data.defaultPermission = this.options.defaultPermission;
    if (this.options.interactionOptions) data.options = this.options.interactionOptions;

    return data;
  }

  /**
   * This is called whenever a command is validated and ready to run. This will parse/set data for running commands.
   * @param {Interaction} interaction
   * @param {CommandEntry} entry - The command entry data within the database.
   */
  public execute (interaction: Interaction, entry: CommandEntry): void
  {
    if (!interaction.isCommand()) return;

    this.entry = entry;

    return this.callback(interaction);
  }
}
