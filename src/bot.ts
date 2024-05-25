import {
  Channel,
  Client,
  CommandInteraction,
  Events,
  GatewayIntentBits,
  InteractionResponse,
  VoiceChannel,
} from "discord.js";
import {
  SlashCommandsHandler,
  ISlashCommandListener,
} from "./slash-commands-handler";
import {
  ISpeakingHistoryListener,
  SpeakingHistory,
  SpeakingHistoryRecord,
} from "./speaking-history";
import { Speaking } from "./speaking";
import { DISCORD_TOKEN } from "../secret.json";
import { UserIdToName } from "./user-id-to-name";
import { SpeakingHistorySummary } from "./speaking-history-summary";

class BotInstance implements ISpeakingHistoryListener {
  private static _channelIdToBotInstance = new Map<string, BotInstance>();

  private readonly _channel: Channel;
  private readonly _channelId: string;
  private readonly _speakingHistory: SpeakingHistory;
  private readonly _speaking: Speaking;
  private readonly _speakingHistorySummary: SpeakingHistorySummary;

  constructor(commandInteraction: CommandInteraction) {
    if (!commandInteraction.channel) {
      throw new Error("No channel, aborting");
    }
    this._channelId = commandInteraction.channel.id;
    this._speakingHistory = new SpeakingHistory(this).setVerbose(true);
    this._speaking = new Speaking(this._speakingHistory).setVerbose(true);
    this._speakingHistorySummary = new SpeakingHistorySummary(
      new UserIdToName(commandInteraction.client)
    );

    this._channel = commandInteraction.channel;
    if (!this._channel) {
      commandInteraction.reply("No channel, aborting");
      return;
    }

    if (!(this._channel instanceof VoiceChannel)) {
      commandInteraction.reply("Not a voice channel, aborting");
      return;
    }

    commandInteraction
      .reply("Monitoring speaking in this channel")
      .then((value: InteractionResponse<boolean>) => {
        if (value instanceof InteractionResponse) {
          console.log(`message id : ${value.id}`);
          value.edit("edited!");
          value.edit("edited again!");
        }
      });

    // Remove any existing bot instance.
    const botInstance: BotInstance | undefined =
      BotInstance._channelIdToBotInstance.get(this._channelId);
    if (botInstance) {
      botInstance.close();
    }

    // Register this bot instance.
    BotInstance._channelIdToBotInstance.set(this._channelId, this);

    // Connect to the channel.
    this._speaking.connect(this._channel);
  }

  close() {
    this._speaking.disconnect();
    BotInstance._channelIdToBotInstance.delete(this._channel.id);
  }

  onSpeakingHistoryUpdated(speakingHistory: SpeakingHistory): void {
    const history: Array<SpeakingHistoryRecord> = speakingHistory.history();
    const summary: string = this._speakingHistorySummary.summary(history);
    console.log(summary);
    // TODO update summary in channel message
  }

  onSpeakingHistoryDisconnected(): void {
    this.close();
  }
}

class BotSlashCommandListener implements ISlashCommandListener {
  onSlashCommand(commandInteraction: CommandInteraction) {
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
