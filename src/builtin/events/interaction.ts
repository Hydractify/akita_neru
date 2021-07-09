import { DMChannel, Interaction, TextChannel } from 'discord.js';
import { DeepPartial } from 'typeorm';

import CommandEntry from '../entities/CommandEntries';
import { AkitaNeru } from '../../managers/framework';
import { ChannelType } from '../../structures/command/enums';
import { Client } from '../../structures/client';
import { ClientEvent } from '../../structures/event';
import { DatabaseManager } from '../../managers/database';

type NonNullProperties<T, NonNull extends keyof T> = {
  [P in NonNull]: NonNullable<T[P]>;
} & Omit<T, NonNull>;

type GuildMessage = Omit<NonNullProperties<Interaction, 'guild' | 'user' | 'member'>, 'channel'> & { channel: TextChannel };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isGuildInteraction = (interaction: any): interaction is GuildMessage =>
{
  return interaction.guild && interaction.channel instanceof TextChannel;
};

class InteractionEvent extends ClientEvent
{
  private readonly client: Client;

  private readonly database: DatabaseManager;

  private readonly framework: AkitaNeru;

  constructor (akita: AkitaNeru, client: Client)
  {
    super(client, __filename, 'interaction');

    this.client = client;
    this.database = akita.database;
    this.framework = akita;
  }

  public async callback (interaction: Interaction): Promise<void>
  {
    // Ignore system interaction calls coming from bots.
    if (interaction.user.bot) return;

    if (isGuildInteraction(interaction))
    {
      // Ensure that there will always be a member instance
      if (!interaction.member) await interaction.guild.members.fetch(interaction.user.id);
    }
    // If this is being ran in a DM, ensure that commands are allowed in DMs.
    else if (interaction.channel instanceof DMChannel && !this.framework.config.options.commands.allowDM)
    {
      this.client.channels.cache.delete(interaction.channel.id);

      return;
    }

    if (interaction.isCommand())
    {
      const command = this.client.commands.resolver.resolveInteraction(interaction.commandName);
      if (!command) return;

      // Check if the command can only be ran in DMs.
      if (command.options.channelType === ChannelType.DM && !(interaction.channel instanceof DMChannel))
      {
        await interaction.reply({ content: 'This command can only be used inside DMs.', ephemeral: true });

        return;
      }

      // Check if the command can only be ran in Guilds.
      if (command.options.channelType === ChannelType.GUILD && !(interaction.channel instanceof TextChannel))
      {
        await interaction.reply({ content: 'This command can only be used inside servers.', ephemeral: true });

        return;
      }

      // Restrict developer commands, to developers only
      if (command.options.isDeveloper && !this.framework.config.options.developerIDs.includes(interaction.user.id))
      {
        await interaction.reply({ content: 'This is a command restricted to developers only.', ephemeral: true });

        return;
      }

      // If it's being ran in a guild, check for the permissions required by the command.
      if (command.options.channelType === ChannelType.GUILD)
      {
        const member = interaction.guild!.members.resolve(interaction.user.id);

        if (command.options.permissions?.some(permission => !member!.permissions.has(permission)))
        {
          await interaction.reply('You do not have enough permission to run this command!');

          return;
        }
      }

      // Check if there are any custom restrictions, if message is restricted, don't allow a command to run
      if (command.options.restricted && !command.options.restricted(interaction)) return;

      const entryRepository = this.database.getRepository(CommandEntry);

      // Create a dummy object to be saved to the database after validating the cooldown.
      const newEntry: DeepPartial<CommandEntry> = {
        commandName: command.options.name,
        guildId: interaction.guild?.id,
        userId: interaction.user.id,
      };

      const lastEntry = await entryRepository
        .findOne({ commandName: command.options.name, userId: interaction.user.id }, { order: { id: 'DESC' } });

      // If there's no entry for this command, keep going
      if (lastEntry)
      {
        const timeSinceLastCall = Date.now() - lastEntry.ranAt.getTime();

        // If the last time the user called the command, is lower than the cooldown, stop.
        if (timeSinceLastCall < command.options.cooldown!)
        {
          const waitTime = Math.trunc((Date.now() + timeSinceLastCall) / 1000);

          await interaction.reply({
            content: `You've been using this command too fast! Try it <t:${waitTime}:R>.`,
            ephemeral: true,
          });

          return;
        }
      }

      // Register a command entry before running.
      const entry = await entryRepository.save(newEntry);

      await command.execute(interaction, entry);
      return;
    }

    return;
  }
}

export { InteractionEvent as ClientEvent };
