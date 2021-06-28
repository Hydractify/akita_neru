import { Interaction } from 'discord.js';

import { AkitaNeru } from '../../managers/framework';
import { Client } from '../../structures/client';
import { ClientEvent } from '../../structures/event';
import { CommandType } from '../../managers/command/enums';

class InteractionEvent extends ClientEvent
{
  private readonly client: Client;

  private readonly framework: AkitaNeru;

  constructor (akita: AkitaNeru, client: Client)
  {
    super(client, __filename, 'interaction');

    this.client = client;
    this.framework = akita;
  }

  public async callback (interaction: Interaction): Promise<void>
  {
    if (!this.framework.config.options.commands.allowDM && !interaction.guildID) return;

    if (interaction.isCommand())
    {
      const command = this.client.commands.find(interaction.commandName, CommandType.INTERACTION);
      if (!command) return;

      // Restrict developer commands, to developers only
      if (command.options.isDeveloper && !this.framework.config.options.developerIDs.includes(interaction.user.id))
      {
        await interaction.reply({ content: 'This is a command restricted to developers only.', ephemeral: true });

        return;
      }

      // Check if there are any custom restrictions, if message is restricted, don't allow a command to run
      if (command.options.restricted && !command.options.restricted(interaction)) return;

      await command.callback(interaction, { args: [], content: '', name: '' });
      return;
    }

    return;
  }
}

export { InteractionEvent as ClientEvent };
