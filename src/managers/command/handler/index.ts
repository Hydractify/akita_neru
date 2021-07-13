import { DMChannel, Interaction, Message, TextChannel } from 'discord.js';

import CommandEntry from '../../../builtin/entities/CommandEntries';
import { AkitaNeru } from '../../framework';
import { BaseCommand } from '../../../structures/command';
import { ChannelType } from '../../../structures/_all';
import { Client } from '../../../structures/client';
import { ConfigManager } from '../../config';
import { DatabaseManager } from '../../database';
import { GuildObject } from './interfaces';

export class CommandHandler
{
  protected readonly client: Client;

  protected readonly config: ConfigManager;

  protected readonly database: DatabaseManager;

  protected readonly framework: AkitaNeru;

  constructor (akita: AkitaNeru, client: Client)
  {
    this.client = client;
    this.config = akita.config;
    this.database = akita.database;
    this.framework = akita;
  }

  /**
   * Handles interaction events, calling the command, buttons or component callbacks.
   * @param {Interaction} interaction
   */
  public async handleInteractionCommand (interaction: Interaction): Promise<void>
  {
    // Perform the basic validation, if something is wrong, return.
    if (!await this.handleBasicValidation(interaction)) return;

    if (interaction.isCommand())
    {
      const command = this.client.commands.resolver.resolveSlash (interaction.commandName);
      if (!command) return;

      // Perform command validation, if something is wrong, return.
      const commandEntry = await this.handleCommandValidation(interaction, command);
      if (!commandEntry) return;

      command.execute(interaction, commandEntry);
    }

    if (interaction.isMessageComponent())
    {
      const parsedCustomId = this.client.commands.resolver.parseCustomId(interaction.customId);
      if (!parsedCustomId) return;

      const command = this.client.commands.resolver.resolveComponent(parsedCustomId.commandName);
      if (!command) return;

      // Perform command validation, if something is wrong, return.
      const commandEntry = await this.handleCommandValidation(interaction, command);
      if (!commandEntry) return;

      command.execute(interaction, commandEntry, parsedCustomId);
    }
  }

  /**
   * Handles message events, calling the command callback.
   * @param {Message} message
   */
  public async handleMessageCommand (message: Message): Promise<void>
  {
    // Perform the basic validation, if something is wrong, return.
    if (!await this.handleBasicValidation(message)) return;

    // Parse command's message to check whether the prefix is being used.
    const parsedCommand = this.client.commands.resolver.parsePrefix(message.content);
    if (!parsedCommand) return;

    const command = this.client.commands.resolver.resolveMessage(parsedCommand.commandName);
    if (!command) return;

    // Perform command validation, if something is wrong, return.
    const commandEntry = await this.handleCommandValidation(message, command);
    if (!commandEntry) return;

    await command.execute(message, commandEntry, parsedCommand);
  }

  /**
   * Handles the basic validation when receiving interaction and message events.
   * @param {(Interaction | Message)} action - The received event object.
   * @returns {Promise.<boolean>}
   */
  protected async handleBasicValidation (action: Interaction | Message): Promise<boolean>
  {
    const user = action instanceof Interaction
      ? action.user
      : action.author;

    // Ignore incoming calls coming from bots.
    if (user.bot) return false;

    if (this.isGuildObject(action))
    {
      // Ensure that there will always be a member instance.
      if (!action.member) await action.guild.members.fetch(user.id);
    }
    // If this is being ran in a DM, ensure that commands are allowed in DMs.
    else if (action.channel instanceof DMChannel && !this.config.options.commands.allowDM)
    {
      this.client.channels.cache.delete(action.channel.id);

      return false;
    }

    return true;
  }

  /**
   * Handles the validation of commands.
   * @param {(Interaction | Message)} action - The received event object.
   * @param {BaseCommand} command - The command to be validated.
   * @param {boolean} shouldSendEphemeral - Whether ephemeral messages should be sent upon validation.
   * @returns {Promise.<boolean>}
   */
  protected async handleCommandValidation (
    action: Interaction | Message,
    command: BaseCommand,
    shouldSendEphemeral: boolean = true,
  ): Promise<CommandEntry | void>
  {
    // HACK: Ensure it's an interaction and non-generic, since the `Interaction` type doesn't has
    // properties/methods such as 'reply'.
    if (action instanceof Interaction
      && !(action.isButton()
        || action.isCommand()
        || action.isMessageComponent()
        || action.isSelectMenu())) return;

    // Checks if it's being run in the correct channel.
    const isValidChannelType = (channelType: ChannelType, message: string): boolean =>
    {
      const isValidInstance = channelType === ChannelType.DM
        ? action.channel instanceof DMChannel
        : action.channel instanceof TextChannel;

      if (command.options.channelType === channelType && !isValidInstance)
      {
        action instanceof Interaction
          ? action.reply({ content: message, ephemeral: shouldSendEphemeral })
          : action.reply(message);

        return false;
      }

      return true;
    };

    // Check if the command can only be ran in DMs.
    // FIXME: Replace with i18n aware message.
    if (!isValidChannelType(ChannelType.DM, 'This command can only be used inside DMs.')) return;

    // Check if the command can only be ran in Guilds.
    // FIXME: Replace with i18n aware message.
    if (!isValidChannelType(ChannelType.GUILD, 'This command can only be used inside servers.')) return;

    const user = action instanceof Interaction ? action.user : action.author;

    // Restrict developer commands, to developers only.
    if (command.options.isDeveloper && !this.config.options.developerIDs.includes(user.id))
    {
      // FIXME: Replace with i18n aware message.
      const content = 'This is a command restricted to developers only.';

      action instanceof Interaction
        ? await action.reply({ content, ephemeral: shouldSendEphemeral })
        : await action.reply(content);

      return;
    }

    // FIXME: No clue why the `Interaction`'s and the `Message`'s member have a different 'permissions' property.
    // Resolving the member first makes so TS will not complain.
    const member = action.guild?.members.resolve(user.id);

    if (command.options.channelType === ChannelType.GUILD
      && command.options.permissions?.some(permission => !member!.permissions.has(permission)))
    {
      // FIXME: Replace with i18n aware message.
      const content = 'You do not have enough permissions to run this command!';

      action instanceof Interaction
        ? await action.reply({ content, ephemeral: shouldSendEphemeral })
        : await action.reply(content);
    }

    // If there are any custom restrictions and it is restricted, don't allow the command to run.
    if (command.options.isRestricted && command.options.isRestricted(action)) return;

    const commandEntryRepository = this.database.getRepository(CommandEntry);

    const oldCommandEntry = await commandEntryRepository
      .findOne({ commandName: command.options.name, userId: user.id }, { order: { id: 'DESC' } });

    if (oldCommandEntry)
    {
      const timeSinceLastCall = Date.now() - oldCommandEntry.ranAt.getTime();

      if (timeSinceLastCall < command.options.cooldown!)
      {
        const waitTime = Math.trunc((Date.now() + timeSinceLastCall) / 1000);

        // FIXME: Replace with i18n aware message.
        const content = `You've been using this command too fast! Try it in: <t:${waitTime}:R>`;

        action instanceof Interaction
          ? await action.reply({ content, ephemeral: shouldSendEphemeral })
          : await action.reply(content);

        return;
      }
    }

    return commandEntryRepository.save({
      commandName: command.options.name,
      guildId: action.guild?.id,
      userId: user.id,
    });
  }

  /**
   * Check whether it's a guild object or not.
   * @param {*} i - The object to be checked.
   * @returns {boolean}
   */
  public isGuildObject (i: any): i is GuildObject // eslint-disable-line @typescript-eslint/no-explicit-any
  {
    return i.guild && i.channel instanceof TextChannel;
  }
}
