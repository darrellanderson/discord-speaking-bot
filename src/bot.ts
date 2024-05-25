import {
  Channel,
  Client,
  CommandInteraction,
  Events,
  GatewayIntentBits,
  Interaction,
} from "discord.js";
import {
  SlashCommandsHandler,
  ISlashCommandListener,
} from "./slash-commands-handler";
import { ISpeakingHistoryListener, SpeakingHistory } from "./speaking-history";
import { Speaking } from "./speaking";
import { DISCORD_TOKEN } from "../secret.json";

class BotInstance implements ISpeakingHistoryListener {
  private static _channelIdToBotInstance = new Map<string, BotInstance>();
  private readonly _channelId: string;
  private readonly _speakingHistory: SpeakingHistory;
  private readonly _speaking: Speaking;

  constructor(commandInteraction: CommandInteraction) {
    const channel: Channel | null = commandInteraction.channel;
    this._channelId = channel?.id || "";
    this._speakingHistory = new SpeakingHistory(this).setVerbose(true);
    this._speaking = new Speaking(this._speakingHistory).setVerbose(true);

    if (!channel) {
      commandInteraction.reply("No channel, aborting");
      console.error("BotSlashCommandListener: no channel, aborting");
      return;
    }

    // Remove any existing bot instance.
    const botInstance: BotInstance | undefined =
      BotInstance._channelIdToBotInstance.get(this._channelId);
    if (botInstance) {
      console.log("BotInstance: closing existing bot instance");
      botInstance.close();
    }

    // Register this bot instance.
    console.log("BotInstance: registering bot instance");
    BotInstance._channelIdToBotInstance.set(this._channelId, this);

    // Connect to the channel.
    this._speaking.connect(channel);
  }

  close() {
    console.log("BotInstance: closing bot instance");
    this._speaking.disconnect();
    BotInstance._channelIdToBotInstance.delete(this._channelId);
  }

  onSpeakingHistoryUpdated(speakingHistory: SpeakingHistory): void {
    // TODO update summary in channel message
  }

  onSpeakingHistoryDisconnected(): void {
    this.close();
  }
}

class BotSlashCommandListener implements ISlashCommandListener {
  onSlashCommand(commandInteraction: CommandInteraction) {
    console.log("BotSlashCommandListener: onSlashCommand");
    new BotInstance(commandInteraction);
  }
}

// ------------------------------------

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    // GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.on(Events.Error, console.error);

client.once(Events.ClientReady, (readyClient: Client) => {
  console.log(`Ready! Logged in as ${readyClient.user?.tag}`);

  new SlashCommandsHandler(client, new BotSlashCommandListener())
    .setVerbose(true)
    .addCommand("speaking", "Report recent speakers with speaking durations")
    .apply();
});

console.log("starting bot...");
client.login(DISCORD_TOKEN);
