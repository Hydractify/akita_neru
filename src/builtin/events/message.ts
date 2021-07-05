import { DMChannel, Message, TextChannel } from 'discord.js';
import { DeepPartial } from 'typeorm';

import CommandEntry from '../entities/CommandEntries';
import { AkitaNeru } from '../../managers/framework';
import { ChannelType } from '../../structures/command/enums';
import { Client } from '../../structures/client';
import { ClientEvent } from '../../structures/event';
import { CommandType } from '../../managers/command/enums';
import { DatabaseManager } from '../../managers/database';
import { MessageCommand } from '../../structures/command';

type NonNullProperties<T, NonNull extends keyof T> = {
  [P in NonNull]: NonNullable<T[P]>;
} & Omit<T, NonNull>;

type GuildMessage = Omit<NonNullProperties<Message, 'guild' | 'author' | 'member'>, 'channel'> & { channel: TextChannel };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isGuildMessage = (message: any): message is GuildMessage =>
{
  return message.guild && message.channel instanceof TextChannel;
};

class MessageEvent extends ClientEvent
{
  private readonly client: Client;

  private readonly database: DatabaseManager;

  private readonly framework: AkitaNeru;

  constructor (akita: AkitaNeru, client: Client)
  {
    super(client, __filename, 'message');

    this.client = client;
    this.database = akita.database;
    this.framework = akita;
  }

  public async callback (message: Message): Promise<void>
  {
    try
    {
      // Ignore system messages and messages coming from bots.
      if (message.system || message.author.bot)
      {
        message.channel.messages.cache.delete(message.id);

        return;
      }

      // Parse command's message to check whether the prefix is being used.
      const parsedCommand = this.client.commands.parseMessage(message.content);
      if (!parsedCommand) return;

      if (isGuildMessage(message))
      {
        // Ensure that there will always be a member instance
        if (!message.member) await message.guild.members.fetch(message.author.id);
      }
      // If this is being ran in a DM, ensure that commands are allowed in DMs.
      else if (message.channel instanceof DMChannel && !this.framework.config.options.commands.allowDM)
      {
        this.client.channels.cache.delete(message.channel.id);
        message.channel.messages.cache.delete(message.id);

        return;
      }

      const command = this.client.commands.find(parsedCommand.name, CommandType.MESSAGE) as MessageCommand;
      if (!command)
      {
        await message.reply(`There is no command matching \`${parsedCommand.name}\`.`);

        return;
      }

      // Check if the command can only be ran in DMs.
      if (command.options.channelType === ChannelType.DM && !(message.channel instanceof DMChannel))
      {
        await message.reply('This command can only be used inside DMs.');

        return;
      }

      // Check if the command can only be ran in Guilds.
      if (command.options.channelType === ChannelType.GUILD && !(message.channel instanceof TextChannel))
      {
        await message.reply('This command can only be used inside servers.');

        return;
      }

      // Restrict developer commands, to developers only
      if (command.options.isDeveloper && !this.framework.config.options.developerIDs.includes(message.author.id))
      {
        await message.reply('This is a command restricted to developers only.');

        return;
      }

      // If it's being ran in a guild, check for the permissions required by the command.
      if (command.options.channelType === ChannelType.GUILD)
      {
        if (command.options.permissions?.some(permission => !message.member!.permissions.has(permission)))
        {
          await message.reply('You do not have enough permission to run this command!');

          return;
        }
      }

      // Check if there are any custom restrictions, if message is restricted, don't allow a command to run
      if (command.options.restricted && !command.options.restricted(message)) return;

      const entryRepository = this.database.getRepository(CommandEntry);

      // Create a dummy object to be saved to the database after validating the cooldown.
      const newEntry: DeepPartial<CommandEntry> = {
        commandName: command.options.name,
        guildId: message.guild?.id,
        userId: message.author.id,
      };

      const lastEntry = await entryRepository
        .findOne({ commandName: newEntry.commandName, userId: newEntry.userId }, { order: { id: 'DESC' } });

      // If there's no entry for this command, keep going
      if (lastEntry)
      {
        const timeSinceLastCall = Date.now() - lastEntry.ranAt.getTime();

        // If the last time the user called the command, is lower than the cooldown, stop.
        if (timeSinceLastCall < command.options.cooldown!)
        {
          const waitTime = Math.trunc((Date.now() + timeSinceLastCall) / 1000);

          await message.reply(`You've been using this command too fast! Try it <t:${waitTime}:R>.`);

          return;
        }
      }

      // Register a command entry before running.
      const entry = await entryRepository.save(newEntry);

      await command.execute(message, entry, parsedCommand);
    }
    finally
    {
      message.channel.messages.cache.delete(message.id);
    }

    return;
  }
}

export { MessageEvent as ClientEvent };
