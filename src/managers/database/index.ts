import { Connection, createConnection, EntityTarget, Repository } from 'typeorm';
import { join } from 'path';

import { BaseManagedFile } from '../../structures/file';
import { BaseManager } from '../../structures/manager';
import { ConfigManager } from '../config';

export class DatabaseManager extends BaseManager
{
  /** The database's connection. */
  public connection!: Connection;

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
        `${this.entitiesDirectory}/**/*.js`,
        `${join(this.config.akitaNeruRoot, 'builtin', 'entities')}/**/*.js`,
      ],
    });
  }

  /** Shorthand to get repositories. */
  public getRepository<Entity> (target: EntityTarget<Entity>): Repository<Entity>
  {
    return this.connection.getRepository(target);
  }

  /** The user's directory containing the ORM entities. */
  private get entitiesDirectory (): string
  {
    return this.config.options.database.entitiesDirectory;
  }
}
