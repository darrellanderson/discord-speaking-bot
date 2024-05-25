import {
  Client,
  CommandInteraction,
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
  /**
   * Called when a discord user invokes the slash command.
   *
   * @param commandInteraction the slash command message
   */
  onSlashCommand(commandInteraction: CommandInteraction): void;
}

export class SlashCommandsHandler {
  private readonly _client: Client;
  private readonly _listener: ISlashCommandListener;
  private readonly _commandNameToDescription: Map<string, string> = new Map();

  private _verbose: boolean = false;

  constructor(client: Client, listener: ISlashCommandListener) {
    this._client = client;
    this._listener = listener;
  }

  addCommand(name: string, description: string): this {
    if (this._verbose) {
      console.log(`SlashCommandsHandler.addCommand: ${name} ${description}`);
    }
    this._commandNameToDescription.set(name, description);
    return this;
  }

  _refreshDiscordSlashCommands(): void {
    const token: string | null = this._client.token;
    const clientId: string | undefined = this._client.application?.id;

    if (!token) {
      throw new Error("SlashCommandsHandler: missing token");
    }
    if (!clientId) {
      throw new Error("SlashCommandsHandler: missing token");
    }

    const commands: Array<RESTPostAPIChatInputApplicationCommandsJSONBody> = [];
    this._commandNameToDescription.forEach((description, name) => {
      commands.push(
        new SlashCommandBuilder()
          .setName(name)
          .setDescription(description)
          .toJSON()
      );
    });

    if (this._verbose) {
      console.log(
        `SlashCommandsHandler._refreshDiscordSlashCommands: |${commands.length}|`
      );
    }
    const rest = new REST().setToken(token);
    rest
      .put(Routes.applicationCommands(clientId), {
        body: commands,
      })
      .then(() => {
        if (this._verbose) {
          console.log(
            `SlashCommand: reloaded ${commands.length} application (/) commands.`
          );
        }
      });
  }

  _listenForSlashCommands(): void {
    this._client.on(
      Events.InteractionCreate,
      (interaction: Interaction): void => {
        if (!interaction.isCommand()) {
          return;
        }
        const commandInteraction: CommandInteraction =
          interaction as CommandInteraction;
        if (
          !this._commandNameToDescription.has(commandInteraction.commandName)
        ) {
          return;
        }
        if (this._verbose) {
          console.log(
            `SlashCommandsHandler._listenForSlashCommands: ${commandInteraction.commandName}`
          );
        }
        this._listener.onSlashCommand(commandInteraction);
      }
    );
  }
}
