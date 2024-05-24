export interface ISpeakingListener {
  onSpeakingConnected(): void;
  onSpeakingStart(speaker: string): void;
  onSpeakingEnd(speaker: string): void;
  onSpeakingDisconnected(): void;
}

/**
 * Monitor speaking events, invoke listener.
 * Auto-closes when idle for a period.
 */
export class Speaking {
  private readonly DISCONNECT_IDLE_MSECS = 3600 * 1000;
  private readonly _listener: ISpeakingListener;
  private readonly _speaking: Set<string> = new Set<string>();

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
    if (this._speaking.has(speaker)) {
      return this;
    }
    this._speaking.add(speaker);

    if (this._verbose) {
      console.log(`Speaking: start "${speaker}"`);
    }

    this._listener.onSpeakingStart(speaker);
    return this;
  }

  _speakingEnd(speaker: string): this {
    // Ignore if not speaking (duplicate end event?).
    if (!this._speaking.has(speaker)) {
      return this;
    }
    this._speaking.delete(speaker);

    if (this._verbose) {
      console.log(`Speaking: end "${speaker}"`);
    }

    this._listener.onSpeakingEnd(speaker);
    return this;
  }
}
