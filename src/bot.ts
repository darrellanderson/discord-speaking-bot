import {
  Channel,
  Client,
  CommandInteraction,
  Events,
  GatewayIntentBits,
  Message,
  VoiceChannel,
  Webhook,
  WebhookCreateOptions,
} from "discord.js";

import {
  SlashCommandsHandler,
  ISlashCommandListener,
} from "./slash-commands-handler";
import {
  ISpeakingHistoryListener,
  SpeakingHistory,
  SpeakingRecord,
} from "./speaking-history";
import { Speaking } from "./speaking";
import { DISCORD_TOKEN } from "../secret.json";
import { UserIdToName } from "./user-id-to-name";
import { SpeakingHistorySummary } from "./speaking-history-summary";

class BotInstance implements ISpeakingHistoryListener {
  private static IDLE_TIMEOUT_MS = 1000 * 60; //3600;

  private static _channelIdToBotInstance = new Map<string, BotInstance>();

  private readonly _channel: Channel;
  private readonly _channelId: string;
  private readonly _speakingHistory: SpeakingHistory;
  private readonly _speaking: Speaking;
  private readonly _speakingHistorySummary: SpeakingHistorySummary;

  private readonly _idleDisconnect = () => {
    this.editWebhookMessage("Idle too long, disconnecting");
    this.close();
  };

  private _webhook: Webhook | undefined;
  private _webhookMessage: Message | undefined;
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

    const reject = (error: string) => {
      console.error(`BotInstance error: ${error}`);
      this.close();
    };

    this._channel = commandInteraction.channel;
    if (!this._channel) {
      commandInteraction.reply("No channel, aborting");
      return;
    }

    if (!(this._channel instanceof VoiceChannel)) {
      commandInteraction.reply("Not a voice channel, aborting");
      return;
    }

    const options: WebhookCreateOptions = {
      channel: this._channel,
      name: "test-webhook",
    };
    this._channel.createWebhook(options).then((webhook) => {
      console.log(`BotInstance createWebhook: ${webhook.id} ${webhook.token}`);
      this._webhook = webhook;
      this._webhook.send("Hello, world!").then((message) => {
        this._webhookMessage = message;
        this.editWebhookMessage("edit success");
      }, reject);
    }, reject);

    // Remove any existing bot instance.
    const botInstance: BotInstance | undefined =
      BotInstance._channelIdToBotInstance.get(this._channelId);
    if (botInstance) {
      botInstance.close();
    }

    // Register this bot instance.
    BotInstance._channelIdToBotInstance.set(this._channelId, this);

    // Connect to the channel.
    this._speaking.connect(this._channel).then(() => {}, reject);

    commandInteraction.reply(
      "Speaking bot active, sending TTPG access token via private message."
    );
    /*
    commandInteraction.user.send("private message test").then((message) => {});
    */

    // Start idle timer.
    this._idleCheckHandle = setTimeout(
      this._idleDisconnect,
      BotInstance.IDLE_TIMEOUT_MS
    );
  }

  close() {
    console.log(`BotInstance.close`);
    BotInstance._channelIdToBotInstance.delete(this._channel.id);

    try {
      this._speaking.disconnect();
    } catch (error) {
      console.error(`BotInstance.close: ${error}`);
    }

    if (this._webhook) {
      console.log(`BotInstance.close: deleting webhook`);
      try {
        this._webhook.delete();
        this._webhook = undefined;
      } catch (error) {
        console.error(`BotInstance.close: ${error}`);
      }
    }
  }

  editWebhookMessage(content: string) {
    if (this._webhookMessage && this._webhookMessage) {
      this._webhook?.editMessage(this._webhookMessage, { content });
    }
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

  updateResponse() {
    const history: Array<SpeakingRecord> = this._speakingHistory.history();
    this._speakingHistorySummary
      .summaryAsync(history)
      .then((summary: string) => {
        this.editWebhookMessage(summary);
      });

    // Restart idle timer.
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
    //GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildWebhooks,
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
