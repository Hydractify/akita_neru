import { EventEmitter } from 'events';
import { ClientOptions } from 'discord.js';
import { ConnectionOptions } from 'typeorm';

export interface IConfig
{
  client: {
    options?: ClientOptions
    token: string
  }
  commands: {
    disabled?: boolean
    allowDM?: boolean
    prefix: string[]
    messages: {
      invalid?: string
    }
  }
  database: {
    disabled?: boolean
    options?: ConnectionOptions
  }
  developers: string[]
  directories: {
    commands?: string
    entities?: string
    events?: string
  }
  emitters?: { [key: string]: EventEmitter }
  _emitters: Map<string, EventEmitter> // The one used internally.
}
