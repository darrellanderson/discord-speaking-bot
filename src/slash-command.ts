import {
  Client,
  Events,
  Interaction,
  REST,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
  Routes,
  SlashCommandBuilder,
} from "discord.js";

/**
 * Called each time the slash command is invoked, with the slash message.
 */
export interface ISlashCommandListener {
  onSlashCommand(interaction: Interaction): void;
}

export class SlashCommand {
  constructor(
    auth: { client: Client; DISCORD_CLIENT_ID: string; DISCORD_TOKEN: string },
    command: { name: string; description: string },
    listener: ISlashCommandListener
  ) {
    const commands: Array<RESTPostAPIChatInputApplicationCommandsJSONBody> = [
      new SlashCommandBuilder()
        .setName(command.name)
        .setDescription(command.description)
        .toJSON(),
    ];

    auth.client.on(
      Events.InteractionCreate,
      async (interaction: Interaction) => {
        console.log(`InteractionCreate: ${interaction.id}`);
        if (!interaction.isCommand()) {
          return;
        }
        if (interaction.commandName !== command.name) {
          return;
        }
        console.log(
          `SlashCommand InteractionCreate: ${interaction.commandName}`
        );
        interaction.reply("Acknowledged");
        listener.onSlashCommand(interaction);
      }
    );

    console.log(
      `SlashCommand: refreshing ${commands.length} application (/) commands.`
    );
    try {
      const rest = new REST().setToken(auth.DISCORD_TOKEN);
      rest
        .put(Routes.applicationCommands(auth.DISCORD_CLIENT_ID), {
          body: commands,
        })
        .then(() => {
          `SlashCommand: reloaded ${commands.length} application (/) commands.`;
        })
        .catch(console.error)
        .finally(() => {
          console.log("SlashCommand: finally called");
        });
    } catch (error) {
      console.error("SlashCommand: error", error);
    }
  }
}
