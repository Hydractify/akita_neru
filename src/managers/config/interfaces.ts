import { ClientOptions } from 'discord.js';
import { ConnectionOptions } from 'typeorm';
import { EventEmitter } from 'events';
import { TranscodeEncoding } from 'buffer';

import { ICommandOptions } from '../../structures/command/interfaces';

export interface IConfig
{
  client: {
    options: ClientOptions
    token: string
  }
  commands: {
    allowDM?: boolean
    customIdEncoding: TranscodeEncoding
    defaultOptions: ICommandOptions
    directory: string
    prefix: string[]
  }
  database: {
    entitiesDirectory: string
    options: ConnectionOptions
  }
  developerIDs: string[]
  events: {
    directory: string
  }
  emitters?: { [key: string]: EventEmitter }
  _emitters: Map<string, EventEmitter> // The one used internally.
}
