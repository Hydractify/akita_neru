import { EventEmitter } from 'events';

import { BaseEvent } from './base';

export abstract class CustomEvent extends BaseEvent
{
  constructor (emitter: EventEmitter, filePath: string, eventName: string)
  {
    super(filePath, {
      name: eventName,
      emitter,
    });
  }
}
