import { WebSocketManager } from 'discord.js';
import { GatewayDispatchEvents } from 'discord-api-types/v8';

import { BaseEvent } from './base';

export abstract class RawEvent extends BaseEvent
{
  constructor (ws: WebSocketManager, filePath: string, eventName: GatewayDispatchEvents)
  {
    super(filePath, {
      name: eventName,
      emitter: ws,
    });
  }
}
