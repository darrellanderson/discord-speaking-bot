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
  private static IDLE_TIMEOUT_MS = 1000 * 3600;

  private static _channelIdToBotInstance = new Map<string, BotInstance>();

  private readonly _channel: Channel;
  private readonly _channelId: string;
  private readonly _speakingHistory: SpeakingHistory;
  private readonly _speaking: Speaking;
  private readonly _speakingHistorySummary: SpeakingHistorySummary;

  private readonly _idleDisconnect = () => {
    this._response?.edit("Idle too long, disconnecting");
    this.close();
  };

  private _response: InteractionResponse<boolean> | undefined;
  private _updateHandle: NodeJS.Timeout | undefined;
  private _idleCheckHandle: NodeJS.Timeout | undefined;

  constructor(commandInteraction: CommandInteraction) {
    if (!commandInteraction.channel) {
      throw new Error("No channel, aborting");
    }
    this._channelId = commandInteraction.channel.id;
    this._speakingHistory = new SpeakingHistory(this).setVerbose(true);
    this._speaking = new Speaking(this._speakingHistory).setVerbose(true);
    this._speakingHistorySummary = new SpeakingHistorySummary(
      new UserIdToName(commandInteraction.client)
    ).setVerbose(true);

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
          this._response = value;
          this.updateResponse();
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

    this._idleCheckHandle = setTimeout(
      this._idleDisconnect,
      BotInstance.IDLE_TIMEOUT_MS
    );
  }

  close() {
    this._speaking.disconnect();
    BotInstance._channelIdToBotInstance.delete(this._channel.id);
  }

  onSpeakingHistoryUpdated(speakingHistory: SpeakingHistory): void {
    if (this._updateHandle) {
      return; // already pending
    }

    // Rate limit updaetes, bots only get so many edits per minute.
    this._updateHandle = setTimeout(() => {
      this._updateHandle = undefined;
      this.updateResponse();
    }, 1000);
  }

  onSpeakingHistoryDisconnected(): void {
    this.close();
  }

  updateResponse() {
    const history: Array<SpeakingHistoryRecord> =
      this._speakingHistory.history();
    this._speakingHistorySummary
      .summaryAsync(history)
      .then((summary: string) => {
        if (this._response) {
          const id: string = this._response.id;
          this._response.edit(`Message id: ${id}\n${summary}`);
        }
      });

    clearTimeout(this._idleCheckHandle);
    this._idleCheckHandle = setTimeout(
      this._idleDisconnect,
      BotInstance.IDLE_TIMEOUT_MS
    );
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
