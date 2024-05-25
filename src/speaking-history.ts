import { ISpeakingListener } from "./speaking";

export interface ISpeakingHistoryListener {
  onSpeakingHistoryUpdated(speakingHistory: SpeakingHistory): void;
  onSpeakingHistoryDisconnected(): void;
}

export type SpeakingHistoryRecord = {
  userId: string;
  startTimestamp: number;
  endTimestamp: number;
};

export class SpeakingHistory implements ISpeakingListener {
  private readonly EVICT_MSECS = 5 * 60 * 1000;

  private readonly _listener: ISpeakingHistoryListener;
  private readonly _userIdToStartTimestamp: Map<string, number> = new Map();
  private readonly _speakingRecords: Array<SpeakingHistoryRecord> = [];

  private _verbose: boolean = false;

  constructor(listener: ISpeakingHistoryListener) {
    this._listener = listener;
  }

  setVerbose(verbose: boolean): this {
    this._verbose = verbose;
    return this;
  }

  history(): Array<SpeakingHistoryRecord> {
    this._evictOldRecords();
    return [...this._speakingRecords];
  }

  onSpeakingConnected(): void {}

  onSpeakingStart(userId: string): void {
    const startTimestamp: number | undefined =
      this._userIdToStartTimestamp.get(userId);
    if (startTimestamp === undefined && this._verbose) {
      console.log(`SpeakingHistory: onSpeakingStart ${userId}`);
    }

    this._userIdToStartTimestamp.set(userId, Date.now());
  }

  onSpeakingEnd(userId: string): void {
    this._evictOldRecords();
    const startTimestamp: number | undefined =
      this._userIdToStartTimestamp.get(userId);
    if (startTimestamp === undefined) {
      return;
    }
    this._userIdToStartTimestamp.delete(userId);
    if (this._verbose) {
      console.log(`SpeakingHistory: onSpeakingEnd ${userId}`);
    }

    this._speakingRecords.push({
      userId,
      startTimestamp,
      endTimestamp: Date.now(),
    });

    this._listener.onSpeakingHistoryUpdated(this);
  }

  onSpeakingDisconnected(): void {
    this._listener.onSpeakingHistoryDisconnected();
  }

  _evictOldRecords(): void {
    const now: number = Date.now();
    this._speakingRecords.forEach((record) => {
      const age: number = now - record.endTimestamp;
      if (age > this.EVICT_MSECS) {
        this._speakingRecords.splice(this._speakingRecords.indexOf(record), 1);
      }
    });
  }
}
