import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export default class CommandEntry
{
  /** The ID of the entry. */
  @PrimaryGeneratedColumn()
  public id!: number;

  /** The name of the command */
  @Column()
  public commandName!: string;

  /**
   * The ID of the guild this was ran. It can be nullable since the framework allows DM commands.
   * This field doesn't uses 'bigint' since it is not supported in TypeORM yet.
   * Check {@link https://github.com/typeorm/typeorm/issues/3136 this} issue for further information.
   */
  @Column({ nullable: true })
  public guildId?: string;

  /**
   * The ID of the user who ran this command.
   * This field doesn't uses 'bigint' for the same reason of 'guildId'.
   */
  @Column()
  public userId!: string;

  /** When the command was ran. */
  @CreateDateColumn()
  public ranAt!: Date;
}
