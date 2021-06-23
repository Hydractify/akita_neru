import { Client as DJSClient } from 'discord.js';

import { AkitaNeru } from '../../managers/framework';
import { CommandManager } from '../../managers/command';
import { EventManager } from '../../managers/event';
import { ListenerUtil } from '../../util/ListenerUtil';

const { on, once, registerListeners }: typeof ListenerUtil = ListenerUtil;

export class Client extends DJSClient
{
  public readonly commands: CommandManager;

  public readonly events: EventManager;

  protected readonly framework: AkitaNeru;

  constructor (akita: AkitaNeru)
  {
    super(akita.config.options.client.options ?? { intents: [] });

    this.framework = akita;

    this.commands = new CommandManager(this.framework);

    this.events = new EventManager(this.framework);

    registerListeners(this);
  }

  public async init (): Promise<void>
  {
    // Set the emitters created by the client.
    this.framework.config.options._emitters.set('ClientEvent', this); // Add client event listening
    this.framework.config.options._emitters.set('RawEvent', this.ws); // Add raw event listening

    await this.commands.init();
    await this.events.init();

    await this.login(this.framework.config.options.client.token);
  }

  @once('ready')
  protected _onReady (): void
  {
    console.log(this.user?.tag);
  }

  @on('warn')
  protected _onWarn (warning: string): void
  {
    console.log(warning);
  }

  @on('debug')
  protected _onDebug (info: string): void
  {
    console.log(info);
  }
}
