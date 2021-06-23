import { Client, Interaction, Message } from 'discord.js';

import { AkitaNeru } from '../../managers/framework';
import { BaseManagedFile } from '../file';
import { ICommandOptions } from './interfaces';
import { ICommandParse } from '../../managers/command/interfaces';

export abstract class BaseCommand extends BaseManagedFile
{
  public readonly options: ICommandOptions;

  protected readonly framework: AkitaNeru;

  protected readonly client: Client;

  constructor (akita: AkitaNeru, filename: string, options: ICommandOptions)
  {
    super(filename);

    this.framework = akita;
    this.client = this.framework.client;

    this.options = options;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public abstract callback (i: Message | Interaction, asserts: ICommandParse): Promise<void> | void;
}
