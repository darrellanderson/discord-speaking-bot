import { Client, Events, GatewayIntentBits, Interaction } from "discord.js";
import { SlashCommand, ISlashCommandListener } from "./slash-command";
import { ISpeakingHistoryListener, SpeakingHistory } from "./speaking-history";
import { Speaking } from "./speaking";
import { DISCORD_CLIENT_ID, DISCORD_TOKEN } from "../secret.json";

class BotInstance implements ISpeakingHistoryListener {
  private static _channelIdToBotInstance = new Map<string, BotInstance>();
  private readonly _channelId: string;
  private readonly _speakingHistory: SpeakingHistory;
  private readonly _speaking: Speaking;

  constructor(channel: any) {
    this._channelId = channel.channelId;
    this._speakingHistory = new SpeakingHistory(this);
    this._speaking = new Speaking(this._speakingHistory).connect(channel);

    // Remove any existing bot instance.
    const botInstance = BotInstance._channelIdToBotInstance.get(
      this._channelId
    );
    if (botInstance) {
      botInstance.close();
    }

    // Register this bot instance.
    BotInstance._channelIdToBotInstance.set(this._channelId, this);
  }

  close() {
    this._speaking.disconnect();
    BotInstance._channelIdToBotInstance.delete(this._channelId);
  }

  onSpeakingHistoryUpdated(speakingHistory: SpeakingHistory): void {
    const summary = speakingHistory.summary();

    // TODO update summary in channel message
  }

  onSpeakingHistoryDisconnected(): void {
    this.close();
  }
}

class BotSlashCommandListener implements ISlashCommandListener {
  onSlashCommand(interaction: Interaction) {
    console.log("BotSlashCommandListener: onSlashCommand");
    const channel = interaction.channel;
    new BotInstance(channel);
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

  new SlashCommand(
    {
      client: readyClient,
      DISCORD_CLIENT_ID,
      DISCORD_TOKEN,
    },
    {
      name: "speaking",
      description: "Report recent speakers with speaking durations",
    },
    new BotSlashCommandListener()
  );
});

console.log("starting bot...");
client.login(DISCORD_TOKEN);
