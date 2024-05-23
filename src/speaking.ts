export interface ISpeakingListener {
  onSpeakingConnected(): void;
  onSpeakingStart(speaker: string, startTimestamp: number): void;
  onSpeakingEnd(
    speaker: string,
    startTimestamp: number,
    endTimestamp: number
  ): void;
  onSpeakingDisconnected(): void;
}

/**
 * Monitor speaking events, invoke listener.
 * Auto-closes when idle for a period.
 */
export class Speaking {
  private readonly DISCONNECT_IDLE_MSECS = 3600 * 1000;
  private readonly _listener: ISpeakingListener;
  private readonly _speakerToStartTimestamp: Map<string, number> = new Map();

  private _verbose: boolean = false;
  private _connected: boolean = false;
  private _disconnectTimeoutHandle: NodeJS.Timeout | undefined = undefined;

  // TODO discord state ...

  constructor(listener: ISpeakingListener) {
    this._listener = listener;
  }

  setVerbose(verbose: boolean): this {
    this._verbose = verbose;
    return this;
  }

  connect(channel: any | "unittest"): this {
    if (this._connected) {
      throw new Error("Already connected");
    }
    this._connected = true;

    if (this._verbose) {
      console.log(`Speaking: connect`);
    }

    // Register discord listeners.
    // ...

    this._listener.onSpeakingConnected();
    return this;
  }

  disconnect(): this {
    // Ignore if not connected.
    if (!this._connected) {
      return this;
    }
    this._connected = false;

    if (this._verbose) {
      console.log(`Speaking: disconnect`);
    }

    // Clear timeout handle (signals was connnected).
    if (this._disconnectTimeoutHandle) {
      clearTimeout(this._disconnectTimeoutHandle);
    }
    this._disconnectTimeoutHandle = undefined;

    // TODO release discord listeners.

    this._listener.onSpeakingDisconnected();
    return this;
  }

  _resetDisconnectTimeout(): this {
    if (this._disconnectTimeoutHandle) {
      clearTimeout(this._disconnectTimeoutHandle);
      this._disconnectTimeoutHandle = undefined;
    }
    this._disconnectTimeoutHandle = setTimeout(() => {
      this.disconnect();
    }, this.DISCONNECT_IDLE_MSECS);
    return this;
  }

  _speakingStart(speaker: string): this {
    // Ignore if already speaking (duplicate start event?).
    let startTimestamp: number | undefined =
      this._speakerToStartTimestamp.get(speaker);
    if (startTimestamp !== undefined) {
      return this;
    }

    if (this._verbose) {
      console.log(`Speaking: start "${speaker}"`);
    }

    // Record start time.
    startTimestamp = Date.now();
    this._speakerToStartTimestamp.set(speaker, startTimestamp);

    // Record start time, trigger event.
    this._listener.onSpeakingStart(speaker, startTimestamp);
    return this;
  }

  _speakingEnd(speaker: string): this {
    // Ignore if not speaking (duplicate end event?).
    const startTimestamp: number | undefined =
      this._speakerToStartTimestamp.get(speaker);
    if (startTimestamp === undefined) {
      return this;
    }

    if (this._verbose) {
      console.log(`Speaking: end "${speaker}"`);
    }

    // Get end time, remove start time entry.
    const endTimestamp: number = Date.now();
    this._speakerToStartTimestamp.delete(speaker);

    // Remove start time, trigger event.
    this._listener.onSpeakingEnd(speaker, startTimestamp, endTimestamp);
    return this;
  }
}
