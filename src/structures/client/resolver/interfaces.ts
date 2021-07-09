import { CachedManager, Snowflake } from 'discord.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface IFetchableManager<V> extends CachedManager<string, V, any>
{
  fetch (resolvable: Snowflake): Promise<V | null>
}

export interface IResolverExpressions
{
  name: (input: string) => RegExp
  roleId: RegExp
  userId: RegExp
}
