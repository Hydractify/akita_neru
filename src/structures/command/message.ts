import { AkitaNeru } from '../../managers/framework';
import { BaseCommand } from './base';
import { ICommandOptions } from './interfaces';

export abstract class MessageCommand extends BaseCommand
{
  constructor (akita: AkitaNeru, filename: string, options: ICommandOptions)
  {
    super(akita, filename, options);
  }
}
