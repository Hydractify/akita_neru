import { DMChannel, Message, TextChannel } from 'discord.js';

import { AkitaNeru } from '../../managers/framework';
import { Client } from '../../structures/client';
import { ClientEvent } from '../../structures/event';
import { CommandType } from '../../managers/command/enums';

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

  private readonly framework: AkitaNeru;

  constructor (akita: AkitaNeru, client: Client)
  {
    super(client, __filename, 'message');

    this.client = client;
    this.framework = akita;
  }

  public async callback (message: Message): Promise<void>
  {
    try
    {
      // Ignore system messages
      if (message.system)
      {
        message.channel.messages.cache.delete(message.id);

        return;
      }

      // Ignore direct messages
      if (!this.framework.config.options.commands.allowDM && message.channel instanceof DMChannel)
      {
        this.client.channels.cache.delete(message.channel.id);
        message.channel.messages.cache.delete(message.id);

        return;
      }

      // Make sure there is a guild and it's being run in a text channel as well as prevent replying to bots
      if (!isGuildMessage(message) || message.author.bot) return;

      // If there is no member cached, fetch it
      if (!message.member) await message.guild.members.fetch(message.author.id);

      const parsedCommand = this.client.commands.parseMessage(message.content);
      if (!parsedCommand) return;

      const command = this.client.commands.find(parsedCommand.name, CommandType.MESSAGE);
      if (!command)
      {
        await message.reply(this.framework.config.options.commands.messages.invalid ?? `There is no command matching \`${parsedCommand.name}\`.`);

        return;
      }

      // Restrict developer commands, to developers only
      if (command.options.isDeveloper && !this.framework.config.options.developers.includes(message.author.id))
      {
        await message.reply('This is a command restricted to developers only.');

        return;
      }

      // Check if there are any custom restrictions, if message is restricted, don't allow a command to run
      if (command.options.restricted && !command.options.restricted(message)) return;

      await command.callback(message, parsedCommand);
    }
    finally
    {
      message.channel.messages.cache.delete(message.id);
    }

    return;
  }
}

export { MessageEvent as ClientEvent };
