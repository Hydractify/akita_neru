import {
  ApplicationCommandOptionData,
  Interaction,
  Message,
  PermissionString,
} from 'discord.js';

import { ChannelType } from './enums';

export interface ICommandOptions
{
  aliases?: string[]
  channelType?: ChannelType
  cooldown?: number // seconds
  defaultPermission?: boolean
  description: string
  interactionOptions?: ApplicationCommandOptionData[]
  isDeveloper?: boolean
  name: string
  permissions?: PermissionString[]
  isRestricted?: (i: Message | Interaction) => Promise<boolean> | boolean
}

export interface ICommandAsserts
{
  args: string[]
  commandName: string
  parsedContent: string
}
