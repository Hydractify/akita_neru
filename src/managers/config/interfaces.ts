import { ClientOptions } from 'discord.js';
import { ConnectionOptions } from 'typeorm';
import { EventEmitter } from 'events';
import { ICommandOptions } from '../../structures/_all';

export interface IConfig
{
  client: {
    options: ClientOptions
    token: string
  }
  commands: {
    allowDM?: boolean
    defaultOptions: ICommandOptions
    directory: string
    disabled?: boolean
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
