import { Guild, GuildMember, Role, User } from 'discord.js';

import { Client } from '../index';
import { ConfigManager } from '../../../managers/config';
import { IFetchableManager, IResolverExpressions } from './interfaces';

/** General resolver structure. */
export class Resolver
{
  /**
   * The expressions used when resolving from inputs.
   * @type {IResolverExpressions}
   */
  public readonly expressions: IResolverExpressions = {
    name: this.composeNameExpression,
    roleId: /^(?:<@&)?(?<id>\d{17,})>?$/,
    userId: /^(?:<@!?)?(?<id>\d{17,})>?$/,
  };

  protected readonly client: Client;

  protected readonly config: ConfigManager;

  constructor (client: Client, config: ConfigManager)
  {
    this.client = client;
    this.config = config;
  }

  /**
   * Resolves a [Role]{@link https://discord.js.org/#/docs/main/master/class/Role} from an input string.
   * @param {string} input - The input which will be resolved into a [Role]{@link https://discord.js.org/#/docs/main/master/class/Role}
   * @param {Guild} guild - The guild this is being ran at.
   * @param {boolean} [allowEveryone=false] - Whether the everyone role is resolvable.
   * @returns {(Role | undefined)}
   */
  public async resolveRole (input: string, guild: Guild, allowEveryone: boolean = false): Promise<Role | undefined>
  {
    // If there's an empty/falsy input, return.
    if (!input) return;

    // Make sure we have all the available roles.
    await guild.roles.fetch();

    const role = await this.fetchMatchStore<Role>(input, this.expressions.roleId, guild.roles);

    if (role)
    {
      if (!allowEveryone && role.id === guild.id) return;

      return role;
    }

    const lowerCaseInput = input.toLowerCase();
    const nameExpression = this.expressions.name(input);

    return guild.roles.cache
      .find(role =>
      {
        // Check for a direct match.
        if (role.name.toLowerCase() === lowerCaseInput) return true;

        if (nameExpression.test(role.name)) return true;

        return false;
      });
  }

  /**
   * Resolves a [GuildMember]{@link https://discord.js.org/#/docs/main/master/class/GuildMember} from an input string.
   * @param {string} input - The input which will be resolved into a [GuildMember]{@link https://discord.js.org/#/docs/main/master/class/GuildMember}
   * @param {Guild} guild - The guild this is being ran at.
   * @param {boolean} [shouldResolveBots=false] - Whether bots are allowed to be resolved out of the inputs.
   * @returns {(GuildMember | undefined)}
   */
  public resolveMember (input: string, guild: Guild, shouldResolveBots: boolean = false): Promise<GuildMember | null | undefined>
  {
    return this.fetchPerson(input, shouldResolveBots, guild) as Promise<GuildMember | null | undefined>;
  }

  /**
   * Resolves a [User]{@link https://discord.js.org/#/docs/main/master/class/User} from an input string.
   * @param {string} input - The input which will be resolved into a [User]{@link https://discord.js.org/#/docs/main/master/class/User}
   * @param {boolean} [shouldResolveBots=false] - Whether bots are allowed to be resolved out of the inputs.
   * @returns {(User | undefined)}
   */
  public resolveUser (input: string, shouldResolveBots: boolean = false): Promise<User | null | undefined>
  {
    return this.fetchPerson(input, shouldResolveBots) as Promise<User | null | undefined>;
  }

  /**
   * Fetches a person, either a [User] or a [GuildMember], based on whether a [Guild] instance is passed.
   * @param {string} input
   * @param {boolean} shouldResolveBots - Whether bots are allowed to be resolved out of the input.
   * @param {Guild} [guild] - The guild this is being ran at.
   * @returns {(GuildMember | User | null | undefined)}
   */
  protected async fetchPerson (input: string, shouldResolveBots: boolean, guild?: Guild): Promise<GuildMember | User | null | undefined>
  {
    // If there's an empty/falsy input, return.
    if (!input) return;

    // Make sure that we have the full list of members every time.
    if (guild && guild.members.cache.size < guild.memberCount) await guild.members.fetch();

    const person = guild
      ? await this.fetchMatchStore<GuildMember>(input, this.expressions.userId, guild.members)
      : await this.fetchMatchStore<User>(input, this.expressions.userId, this.client.users);

    // When it's the case of a mention, return it, unless it's a bot and we don't allow them to be resolved.
    if (person)
    {
      const user = person instanceof User ? person : person.user;
      if (!shouldResolveBots && user.bot) return;

      return person;
    }

    // Possibly undefined if nothing was found.
    return guild
      ? guild.members.cache.find(member => this.handleNameSearch(input, member, shouldResolveBots))
      : this.client.users.cache.find(user => this.handleNameSearch(input, user, shouldResolveBots));
  }

  /**
   * Fetches from a store using a regular expression match.
   * @param {string} input - The input to be matched.
   * @param {RegExp} expression - The expression to be used.
   * @param {IFetchableManager.<*>} store - The store to fetch from.
   * @returns {(IFetchableManager.<*> | null | undefined)}
   */
  protected async fetchMatchStore<V> (
    input: string,
    expression: RegExp,
    store: IFetchableManager<V>,
  ): Promise<V | null | undefined>
  {
    const matchedValues = expression.exec(input);
    if (!matchedValues) return;

    // Get the `id` named group match. See https://www.regular-expressions.info/refext.html
    const capturedValue = matchedValues.groups?.id as `${bigint}`;

    return store.cache.get(capturedValue) || store.fetch(capturedValue).catch(() => undefined);
  }

  /**
   * Handles the callback of the <Array>.find when searching for users/members based on text.
   * @param {string} input - The text to be used as reference.
   * @param {(GuildMember | User)} person - The user/member from each iteration.
   * @param {boolean} shouldResolveBots - Whether bots are allowed to be resolved.
   * @returns {boolean} - Whether they are the correct person being searched for.
   */
  protected handleNameSearch (input: string, person: GuildMember | User, shouldResolveBots: boolean): boolean
  {
    const member = person instanceof GuildMember ? person : undefined;
    const user = person instanceof User ? person : person.user;

    // If we don't allow bots to be resolved, return.
    if (!shouldResolveBots && user.bot) return false;

    const lowerCaseInput = input.toLowerCase();          // The input in lowercase for direct comparison.
    const nameExpression = this.expressions.name(input); // A regular expression to test for incomplete names.

    // Check for direct matches.
    if (member?.nickname?.toLowerCase() === lowerCaseInput
      || user.username.toLowerCase() === lowerCaseInput
      || user.tag.toLowerCase() === lowerCaseInput) return true;

    // Check for loosey matches.
    if (nameExpression.test(user.username)
      || nameExpression.test(member?.nickname ?? '')) return true;

    return false;
  }

  /**
   * Composes an expression to more easily loosely match names.
   * @param {string} input - What needs to be checked for.
   * @returns {RegExp}
   */
  protected composeNameExpression (input: string): RegExp
  {
    return new RegExp(`${input}`, 'i');
  }
}
