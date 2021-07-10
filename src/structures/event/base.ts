import { EventEmitter } from 'events';

import { BaseManagedFile } from '../file';
import { FileEvents } from '../file/enums';
import { IEventOptions } from './interfaces';

export abstract class BaseEvent extends BaseManagedFile
{
  /** An event emitter to listen to events. */
  protected readonly emitter: EventEmitter;

  /**
   * Name of [Client]{@link https://discord.js.org/#/docs/main/stable/class/Client},
   * [Raw]{@link https://discord.com/developers/docs/topics/gateway#event-names} or custom events.
   */
  protected readonly name: string;

  private boundCallback: () => void;

  constructor (filePath: string, options: IEventOptions)
  {
    super(filePath);

    this.emitter = options.emitter;
    this.name = options.name;

    this.boundCallback = this.callback.bind(this);
  }

  /** Add a listener to the Client EventEmitter */
  public listen (): void
  {
    this.emitter.on(this.name, this.boundCallback);
  }

  /**
   * "Reloads" the file.
   * This removes the file from the cache and Node will re-load it once it's required again.
   */
  public override reload (): void
  {
    this.remove();

    delete require.cache[this.filePath];

    this.emit(FileEvents.RELOAD);
  }

  /** Remove the registered listener. */
  public remove (): void
  {
    this.emitter.removeListener(this.name, this.boundCallback);
  }

  /** The callback of the event being listened to. */
  protected abstract callback (...args: any[]): Promise<void> | void; // eslint-disable-line @typescript-eslint/no-explicit-any
}
