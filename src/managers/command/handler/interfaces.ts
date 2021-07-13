import { Interaction, Message, TextChannel } from 'discord.js';

export type NonNullProperties<T, NonNull extends keyof T> = {
  [P in NonNull]: NonNullable<T[P]>;
} & Omit<T, NonNull>;

export type GuildObject = Omit<NonNullProperties<Interaction & Message, 'guild' | 'user' | 'member'>, 'channel'> & { channel: TextChannel };
