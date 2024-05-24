import { SlashCommandBuilder } from "discord.js";

/**
 * Called each time the slash command is invoked, with the slash message.
 */
export interface ISlashCommandListener {
  onSlashCommand(interaction: any): void;
}

export class SlashCommand {
  constructor(builder: SlashCommandBuilder, listener: ISlashCommandListener) {}
}
