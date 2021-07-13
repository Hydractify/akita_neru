import { Message, MessageAttachment } from 'discord.js';
import { inspect, InspectOptions } from 'util';

import { AkitaNeru } from '../../managers/framework';
import { MessageCommand } from '../../structures/command';
import { ICommandAsserts } from '../../structures/_all';

/**
 * Evaluation command, for developer only usage.
 */
class EvaluateCommand extends MessageCommand
{
  protected framework: AkitaNeru;

  /** Options used to inspect evaluation output with. */
  private inspectionOptions: Exclude<InspectOptions, 'depth'> & { depth: number } = { depth: 0 };

  constructor (akita: AkitaNeru)
  {
    super(akita, __filename, {
      aliases: ['eval'],
      description: 'Evaluate JavaScript code.',
      isDeveloper: true,
      name: 'evaluate',
    });

    this.framework = akita;
  }

  public async callback (message: Message, asserts: ICommandAsserts): Promise<Promise<Message> | Message | void>
  {
    let parsedContent = asserts.parsedContent;

    // If it awaits for something, enclose the code in an anonymous asynchronous function
    if (parsedContent.includes('await')) parsedContent = `(async()=>{${parsedContent}})()`;

    try
    {
      let evaluation = await eval(parsedContent);

      if (typeof evaluation !== 'string') evaluation = inspect(evaluation, this.inspectionOptions);

      if (evaluation.length > 1990)
      {
        return message.reply({
          content: 'Result is too long, sending a file instead.',
          files: [ new MessageAttachment(Buffer.from(evaluation), 'evaluation.js') ],
        });
      }

      return await message.reply(['```js', evaluation, '```'].join('\n') || '\u200b');
    }
    catch (error)
    {
      return message.reply([
        '**Error**',
        '```js',
        String(error),
        '```',
      ].join('\n'));
    }
  }

  /** Gets the depth of the evaluation's inspection. */
  protected get depth (): number
  {
    return this.inspectionOptions.depth;
  }

  /** Sets the depth of the evaluation's inspection. */
  protected set depth (value: number)
  {
    this.inspectionOptions.depth = value;
  }
}

export { EvaluateCommand as MessageCommand };
