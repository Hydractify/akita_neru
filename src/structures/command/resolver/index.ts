import { CommandManager } from '../../../managers/command';
import { ConfigManager } from '../../../managers/config';
import { InteractionCommand } from '../interaction';
import { MessageCommand } from '../message';
import { IPrefixParse } from './interfaces';

/** General command resolver structure */
export class CommandResolver
{
  protected commands: CommandManager;

  protected config: ConfigManager;

  constructor (commands: CommandManager, config: ConfigManager)
  {
    this.commands = commands;
    this.config = config;
  }

  /**
   * Parses the content of a message and returns the arguments, command's name and a content without the prefix.
   * @param {string} content
   * @returns {(IPrefixParse | undefined)}
    */
  public parsePrefix (content: string): IPrefixParse | undefined
  {
    const strippedContent = content.split(/\s+/);

    // Find the prefix being used.
    const prefix = this.config.options.commands.prefix
      .find(p =>
      {
        const expression = new RegExp(`^${this.sanatizePrefix(p)}`, 'i');

        return expression.test(strippedContent[0]);
      });
    if (!prefix) return; // If none were used, return.

    // If the content is just the prefix, return.
    if (content.length === prefix.length) return;

    // Remove the prefix from the arguments.
    if (strippedContent[0].length === prefix.length) strippedContent.shift();
    else strippedContent[0] = strippedContent[0].slice(prefix.length);

    return {
      args: strippedContent,
      commandName: strippedContent[0],
      parsedContent: strippedContent.join(' '),
    };
  }

  /**
   * Resolves an interaction from an input.
   * @param {string} name - The command's name
   * @returns {(InteractionCommand | undefined)}
   */
  public resolveInteraction (name: string): InteractionCommand | undefined
  {
    return this.commands.interactions.get(name);
  }

  /**
   * Resolves a message command from an input.
   * @param {string} name - The command's name
   * @returns {(MessageCommand | undefined)}
   */
  public resolveMessage (name: string): MessageCommand | undefined
  {
    return this.commands.messages.get(name) || this.commands.messages.find(command => command.options.aliases?.includes(name) ?? false);
  }

  /**
   * Escapes any special characters from the prefix, needed when creating a regular expression.
   * @param {string} prefix
   * @returns {string}
   */
  private sanatizePrefix (prefix: string): string
  {
    return prefix.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  }
}
