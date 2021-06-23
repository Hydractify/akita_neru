import { ApplicationCommandData } from 'discord.js';

import { AkitaNeru } from '../../managers/framework';
import { BaseCommand } from './base';
import { ICommandOptions } from './interfaces';

export abstract class InteractionCommand extends BaseCommand
{
  constructor (akita: AkitaNeru, filename: string, options: ICommandOptions)
  {
    super(akita, filename, options);
  }

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
}
