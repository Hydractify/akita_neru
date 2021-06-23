import { AkitaNeru } from '../../managers/framework';
import { Client } from '../../structures/client';
import { ClientEvent } from '../../structures/event';

class ReadyEvent extends ClientEvent
{
  private readonly client: Client;

  constructor (akita: AkitaNeru, client: Client)
  {
    super(client, __filename, 'ready');

    this.client = client;
  }

  public async callback (): Promise<void>
  {
    await this.client.commands.setInteractions();

    return;
  }
}

export { ReadyEvent as ClientEvent };
