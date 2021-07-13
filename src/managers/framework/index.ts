import 'reflect-metadata'; // Needed for TypeORM

import { Client } from '../../structures/client';
import { ConfigManager } from '../../managers/config';
import { DatabaseManager } from '../../managers/database';
import { IConfig } from '../../managers/config/interfaces';

export class AkitaNeru
{
  public client: Client;

  public readonly config: ConfigManager;

  public readonly database: DatabaseManager;

  constructor (options?: IConfig)
  {
    this.config = new ConfigManager(options);
    this.database = new DatabaseManager(this.config);
    this.client = new Client(this);
  }

  public async init (): Promise<void>
  {
    await this.config.init();

    await this.database.init();

    await this.client.init();
  }
}
