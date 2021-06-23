import { Connection, createConnection } from 'typeorm';
import { join } from 'path';

import { ConfigManager } from '../config';
import { BaseManager } from '../../structures/manager';
import { BaseManagedFile } from '../../structures/file';

export class DatabaseManager extends BaseManager
{
  // The database's connection.
  public connection: Connection | null = null;

  protected configManager: ConfigManager;

  /** Obligatory implementation */
  protected files: BaseManagedFile[] = [];

  constructor (configManager: ConfigManager, filePath?: string)
  {
    super(filePath ? filePath : __filename);

    this.configManager = configManager;
  }

  public async init (): Promise<void>
  {
    if (this.configManager.options.database.disabled) return;

    this.connection = await createConnection({
      ...this.configManager.options.database.options!,
      entities: [
        join(this.configManager.projectRootDirectory, 'entities'),
        join(this.configManager.akitaNeruRoot, 'builtin', 'entities'),
      ],
    });
  }
}
