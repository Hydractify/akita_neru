import { Client as DJSClient, Interaction, Message } from 'discord.js';

import { AkitaNeru } from '../../managers/framework';
import { CommandManager } from '../../managers/command';
import { EventManager } from '../../managers/event';
import { ListenerUtil } from '../../util/ListenerUtil';
import { Resolver } from './resolver';

const { on, once, registerListeners }: typeof ListenerUtil = ListenerUtil;

export class Client extends DJSClient
{
  public readonly commands: CommandManager;

  public readonly events: EventManager;

  public readonly resolver: Resolver;

  protected readonly framework: AkitaNeru;

  constructor (akita: AkitaNeru)
  {
    super(akita.config.options.client.options ?? { intents: [] });

    this.framework = akita;

    this.commands = new CommandManager(this.framework, this);

    this.events = new EventManager(this.framework);

    this.resolver = new Resolver(this, this.framework.config);

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
  protected onReady (): void
  {
    this.commands.setSlashCommands();
  }

  @on('warn')
  protected onWarn (warning: string): void
  {
    console.log(warning);
  }

  @on('debug')
  protected onDebug (info: string): void
  {
    console.log(info);
  }

  @on('interactionCreate')
  protected onInteractionCreate (interaction: Interaction): void
  {
    this.commands.handler.handleInteractionCommand(interaction);
  }

  @on('messageCreate')
  protected onMessageCreate (message: Message): void
  {
    this.commands.handler.handleMessageCommand(message);
  }
}
