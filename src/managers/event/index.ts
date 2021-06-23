import { join } from 'path';

import { BaseEvent } from '../../structures/event';
import { BaseManager } from '../../structures/manager';
import { ConfigManager } from '../config';
import { AkitaNeru } from '../framework';

export class EventManager extends BaseManager
{
  /** Managed {@see BaseEvent} files to load their events. */
  protected files: BaseEvent[] = [];

  protected framework: AkitaNeru;

  /** The configuration manager to get the project's directory */
  private readonly config: ConfigManager;

  constructor (akita: AkitaNeru)
  {
    super(__filename);

    this.framework = akita;
    this.config = akita.config;
  }

  public async init (): Promise<void>
  {
    const userEvents = await this.fetchUserEvents();
    const builtInEvents = await this.fetchBuiltInEvents();

    this.files = userEvents.concat(builtInEvents);

    this.listenEvents();
  }

  public async refresh (): Promise<void>
  {
    this.files.forEach(event => event.remove());
    this.files = [];

    await this.init();
  }

  private get eventDirectory (): string
  {
    return join(this.config.projectRootDirectory, 'events');
  }

  private get builtInEventDirectory (): string
  {
    return join(this.config.akitaNeruRoot, 'builtin', 'events');
  }

  private async fetchUserEvents (): Promise<BaseEvent[]>
  {
    let files: BaseEvent[] = [];

    for (const [key, emitter] of this.config.options._emitters)
    {
      const listeners = await this.fetchDirectoryFiles(this.eventDirectory, {
        exportedModuleNames: [key],
        constructorArguments: [this.framework, emitter],
      }) as BaseEvent[];

      files = files.concat(listeners);
    }

    return files;
  }

  private async fetchBuiltInEvents (): Promise<BaseEvent[]>
  {
    const client = this.config.options._emitters.get('ClientEvent');

    return await this.fetchDirectoryFiles(
      this.builtInEventDirectory,
      { exportedModuleNames: ['ClientEvent'], constructorArguments: [this.framework, client] },
    ) as BaseEvent[];
  }

  private listenEvents (): void
  {
    this.files.forEach(event => event.listen());
  }
}
