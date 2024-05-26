import {
  Base,
  Channel,
  Client,
  CommandInteraction,
  Events,
  GatewayIntentBits,
  Message,
  TextChannel,
  User,
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
  private static readonly WEBHOOK_NAME = "Speaking History";
  private static readonly IDLE_TIMEOUT_MS = 1000 * 60; //3600;
  private static readonly _channelIdToBotInstance = new Map<
    string,
    BotInstance
  >();

  private readonly _channelId: string;
  private readonly _userIdToName: UserIdToName;

  private _verbose = true;

  private _commandInteractionReply: Message | undefined;
  private _voiceChannel: VoiceChannel | undefined;
  private _webhook: Webhook | undefined;
  private _webhookMessage: Message | undefined;
  private _speakingHistory: SpeakingHistory | undefined;
  private _speaking: Speaking | undefined;
  private _speakingHistorySummary: SpeakingHistorySummary | undefined;

  private _updateHandle: NodeJS.Timeout | undefined;
  private _idleCheckHandle: NodeJS.Timeout | undefined;

  private readonly _idleDisconnect = () => {
    // Edit the command reply, not the webhook.
    // Webhook close may race with edit.
    this._commandInteractionReply?.edit("Idle too long, disconnecting");
    this.close();
  };

  constructor(commandInteraction: CommandInteraction) {
    this._channelId = commandInteraction.channelId;
    this._userIdToName = new UserIdToName(commandInteraction.client);

    // Close any existing bot instance.
    const existingBotInstance: BotInstance | undefined =
      BotInstance._channelIdToBotInstance.get(this._channelId);
    if (existingBotInstance) {
      BotInstance._channelIdToBotInstance.delete(this._channelId);
      existingBotInstance.close();
    }

    // Register this bot instance.
    BotInstance._channelIdToBotInstance.set(this._channelId, this);

    // Initialize, close on error.
    const reject = (error: string) => {
      console.error(`BotInstance error: ${error}`);
      if (this._commandInteractionReply) {
        this._commandInteractionReply.edit(`Error: ${error}`);
      }
      this.close();
    };

    this._createCommandInteractionReply(commandInteraction, "Initializing...")
      .then(() => {
        return this._getVoiceChannel(commandInteraction.channel);
      }, reject)
      .then(() => {
        return this._createWebhook(
          this._voiceChannel,
          BotInstance.WEBHOOK_NAME
        );
      }, reject)
      .then(() => {
        return this._createWebhookMessage(this._webhook, "Waiting for data...");
      }, reject)
      .then(() => {
        return this._connectSpeaking(this._voiceChannel);
      }, reject)
      .then(() => {
        return this._editMessageWithAuthToken();
      }, reject)
      .then(() => {
        console.log(`BotInstance ready`);
      }, reject);

    this._idleCheckHandle = setTimeout(
      this._idleDisconnect,
      BotInstance.IDLE_TIMEOUT_MS
    );
  }

  /**
   * Send the initial command reply.
   * Side effect: sets _commandInteractionReply.
   *
   * @param commandInteraction
   */
  async _createCommandInteractionReply(
    commandInteraction: CommandInteraction,
    content: string
  ): Promise<Message> {
    if (this._verbose) {
      console.log(`BotInstance._createCommandInteractionReply`);
    }
    return new Promise<Message>((resolve, reject) => {
      commandInteraction
        .reply({
          content,
          fetchReply: true,
        })
        .then((message: Message): void => {
          this._commandInteractionReply = message;
          resolve(message);
        }, reject);
    });
  }

  /**
   * Extract the voice channel.
   * Side effect: sets _voiceChannel.
   *
   * @param channel
   * @returns
   */
  async _getVoiceChannel(channel: Channel | null): Promise<VoiceChannel> {
    if (this._verbose) {
      console.log(`BotInstance._getVoiceChannel`);
    }
    return new Promise<VoiceChannel>((resolve, reject) => {
      if (channel && channel instanceof VoiceChannel) {
        this._voiceChannel = channel;
        resolve(channel);
      } else {
        reject("Not a voice channel");
      }
    });
  }

  /**
   * Creates webhook.
   * Side effect: sets _webhook.
   *
   * @param channel
   * @param name
   * @returns
   */
  _createWebhook(
    channel: TextChannel | VoiceChannel | undefined,
    name: string
  ): Promise<Webhook> {
    if (this._verbose) {
      console.log(`BotInstance._createWebhook`);
    }
    return new Promise<Webhook>((resolve, reject) => {
      if (!channel) {
        reject("No channel");
        return;
      }

      // Does webhook already exist?

      channel.fetchWebhooks().then((webhooks) => {
        for (const webhook of webhooks.values()) {
          if (
            webhook.name === name &&
            webhook.owner?.id === channel.client.user?.id
          ) {
            if (this._verbose) {
              console.log(`BotInstance._createWebhook: found existing`);
            }
            this._webhook = webhook;
            resolve(webhook);
            return;
          }
        }

        // Not found, create new one.
        const options: WebhookCreateOptions = {
          channel,
          name,
        };
        channel.createWebhook(options).then((webhook) => {
          this._webhook = webhook;
          resolve(webhook);
        }, reject);
      }, reject);
    });
  }

  /**
   * Creates one webhook message.
   * Side effect: sets _webhookMessage.
   *
   * @param webhook
   * @param content
   * @returns
   */
  _createWebhookMessage(
    webhook: Webhook | undefined,
    content: string
  ): Promise<Message> {
    if (this._verbose) {
      console.log(`BotInstance._createWebhookMessage`);
    }
    return new Promise<Message>((resolve, reject) => {
      if (!webhook) {
        reject("No webhook");
        return;
      }
      webhook.send(content).then((message) => {
        this._webhookMessage = message;
        resolve(message);
      }, reject);
    });
  }

  _connectSpeaking(channel: VoiceChannel | undefined): Promise<void> {
    if (this._verbose) {
      console.log(`BotInstance._connectSpeaking`);
    }
    return new Promise<void>((resolve, reject) => {
      if (!channel) {
        reject("No channel");
        return;
      }
      this._speakingHistorySummary = new SpeakingHistorySummary(
        this._userIdToName
      ).setVerbose(true);
      this._speakingHistory = new SpeakingHistory(this).setVerbose(true);
      this._speaking = new Speaking(this._speakingHistory).setVerbose(true);
      this._speaking.connect(channel).then((): void => {
        resolve();
      }, reject);
    });
  }

  _editMessageWithAuthToken(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this._webhook || !this._webhookMessage) {
        reject("No webhook or message");
        return;
      }
      const json: string = JSON.stringify({
        i: this._webhook.id,
        t: this._webhook.token,
        m: this._webhookMessage.id,
      });
      const b64: string = Buffer.from(json).toString("base64url");

      const content: string = ["TTPG access token:", "```" + b64 + "```"].join(
        "\n"
      );

      if (!this._commandInteractionReply) {
        reject("No command interaction reply");
        return;
      }
      this._commandInteractionReply.edit(content).then(() => {
        resolve();
      }, reject);
    });
  }

  /*
  _createPrivateMessage(user: User, content: string): Promise<Message> {
    if (this._verbose) {
      console.log(`BotInstance._createPrivateMessage`);
    }
    return new Promise<Message>((resolve, reject) => {
      user.send(content).then((message: Message): void => {
        resolve(message);
      }, reject);
    });
  }
  */

  close() {
    console.log(`BotInstance.close`);
    BotInstance._channelIdToBotInstance.delete(this._channelId);

    if (this._speaking) {
      this._speaking.disconnect();
      this._speaking = undefined;
    }

    if (this._webhook) {
      this._webhook.delete();
      this._webhook = undefined;
    }

    if (this._updateHandle) {
      clearTimeout(this._updateHandle);
      this._updateHandle = undefined;
    }

    if (this._idleCheckHandle) {
      clearTimeout(this._idleCheckHandle);
      this._idleCheckHandle = undefined;
    }
  }

  editWebhookMessage(content: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this._webhookMessage && this._webhookMessage) {
        this._webhook
          ?.editMessage(this._webhookMessage, { content })
          .then(() => {
            resolve();
          }, reject);
      } else {
        resolve();
      }
    });
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
    if (
      !this._speakingHistorySummary ||
      !this._speakingHistory ||
      !this._webhook ||
      !this._webhookMessage
    ) {
      return;
    }
    const webhook: Webhook = this._webhook;
    const message: Message = this._webhookMessage;

    const history: Array<SpeakingRecord> = this._speakingHistory.history();
    this._speakingHistorySummary
      .summaryAsync(history)
      .then((content: string) => {
        webhook.editMessage(message, { content });
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
