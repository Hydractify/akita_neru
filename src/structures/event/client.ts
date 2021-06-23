import { Client, ClientEvents } from 'discord.js';

import { BaseEvent } from './base';

export abstract class ClientEvent extends BaseEvent
{
  constructor (client: Client, filePath: string, eventName: keyof ClientEvents)
  {
    super(filePath, {
      name: eventName,
      emitter: client,
    });
  }
}
