import { Connection, createConnection } from 'typeorm';
import { join } from 'path';

import { ConfigManager } from '../config';
import { BaseManager } from '../../structures/manager';
import { BaseManagedFile } from '../../structures/file';

export class DatabaseManager extends BaseManager
{
  // The database's connection.
  public connection: Connection | null = null;

  protected config: ConfigManager;

  /** Obligatory implementation */
  protected files: BaseManagedFile[] = [];

  constructor (configManager: ConfigManager, filePath?: string)
  {
    super(filePath ? filePath : __filename);

    this.config = configManager;
  }

  public async init (): Promise<void>
  {
    this.connection = await createConnection({
      ...this.config.options.database.options,
      entities: [
        this.entitiesDirectory,
        join(this.config.akitaNeruRoot, 'builtin', 'entities'),
      ],
    });
  }

  private get entitiesDirectory (): string
  {
    return this.config.options.database.entitiesDirectory;
  }
}
