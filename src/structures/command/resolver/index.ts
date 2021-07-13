import { CommandManager } from '../../../managers/command';
import { ConfigManager } from '../../../managers/config';
import { IContentParse } from './interfaces';
import { MessageCommand } from '../message';
import { SlashCommand } from '../slash';
import { ComponentCommand } from '../component';

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
   * @returns {(IContentParse | undefined)}
    */
  public parsePrefix (content: string): IContentParse | undefined
  {
    let strippedContent = content.split(/\s+/);

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

    // Remove the command name from the arguments.
    const commandName = strippedContent[0];
    strippedContent = strippedContent.slice(1);

    return {
      commandName,
      args: strippedContent,
      parsedContent: strippedContent.join(' '),
    };
  }

  /**
   * Parses the custom id of an interaction and returns the arguments, command's name and a parsed full id.
   * @param {string} customId
   * @returns {(IContentParse | undefined)}
   */
  public parseCustomId (customId: string): IContentParse | undefined
  {
    let strippedContent = Buffer
      .from(customId, this.config.options.commands.customIdEncoding)
      .toString('utf8')
      .split(/_+/);

    // Remove the command name from the arguments.
    const commandName = strippedContent[0];
    strippedContent = strippedContent.slice(1);

    return {
      commandName,
      args: strippedContent,
      parsedContent: strippedContent.join(' '),
    };
  }

  /**
   * Composes a custom id to be used in a message component.
   * @param {string} commandName - The name of the command that will be called from this component.
   * @param {string[]} args - The additional information you want stored with the command id.
   * @returns {string} - The composed (and maybe encoded) custom id.
   */
  public composeCustomId (commandName: string, args: string[]): string | undefined
  {
    if (!args || !args.length) return;

    return Buffer
      .from(`${commandName}_${args.join('_')}`, 'utf8')
      .toString(this.config.options.commands.customIdEncoding);
  }

  /**
   * Resolves an slash command from an input.
   * @param {string} name - The command's name
   * @returns {(SlashCommand | undefined)}
   */
  public resolveSlash (name: string): SlashCommand | undefined
  {
    return this.commands.slashes.get(name);
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
   * Resolves a component command from a custom id.
   * @param {string} name - The command's name
   * @returns {(ComponentCommand | undefined)}
   */
  public resolveComponent (name: string): ComponentCommand | undefined
  {
    return this.commands.components.get(name);
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
