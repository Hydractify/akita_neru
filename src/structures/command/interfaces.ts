import {
  ApplicationCommandOptionData,
  Interaction,
  Message,
  PermissionString,
} from 'discord.js';

export interface ICommandOptions
{
  aliases?: string[],
  cooldown?: number, // seconds
  defaultPermission?: boolean
  description: string,
  interactionOptions?: ApplicationCommandOptionData[]
  isDeveloper?: boolean
  name: string,
  permissions?: PermissionString[],
  restricted?: (i: Message | Interaction) => boolean,
}
