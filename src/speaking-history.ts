import { ISpeakingListener } from "./speaking";

type SpeakingRecord = {
  speaker: string;
  startTimestamp: number;
  endTimestamp: number;
};

export class SpeakingHistory implements ISpeakingListener {
  private readonly EVICT_MSECS = 5 * 60 * 1000;
  private readonly _speakerToStartTimestamp: Map<string, number> = new Map();
  private readonly _speakingRecords: Array<SpeakingRecord> = [];

  private _characterBudget: number = 2000; // Discord message limit 2000

  constructor() {}

  setCharacterBudget(characterBudget: number): this {
    this._characterBudget = characterBudget;
    return this;
  }

  summary(): string {
    this._evictOldRecords();

    const lines: string[] = this._speakingRecords
      .filter((record) => record.endTimestamp >= 0)
      .map((record): string => {
        const timestamp: string = (record.endTimestamp / 1000).toFixed(1);
        const duration: string = (
          (record.endTimestamp - record.startTimestamp) /
          1000
        ).toFixed(1);
        return `${timestamp} ${record.speaker} ${duration}`;
      });

    // Discord messages are limited to 2000 characters.
    const result: Array<string> = [];
    let budget = this._characterBudget;
    while (lines.length > 0) {
      const line: string | undefined = lines.pop(); // newest to oldest
      if (!line) {
        break;
      }
      const cost = line.length + 1; // +1 for newline
      if (cost > budget) {
        break;
      }
      result.push(line);
      budget -= cost;
    }

    return result.join("\n");
  }

  onSpeakingConnected(): void {}

  onSpeakingStart(speaker: string): void {
    this._speakerToStartTimestamp.set(speaker, Date.now());
  }

  onSpeakingEnd(speaker: string): void {
    this._evictOldRecords();
    const startTimestamp: number | undefined =
      this._speakerToStartTimestamp.get(speaker);
    if (startTimestamp === undefined) {
      return;
    }
    this._speakerToStartTimestamp.delete(speaker);

    this._speakingRecords.push({
      speaker: speaker,
      startTimestamp,
      endTimestamp: Date.now(),
    });
  }

  onSpeakingDisconnected(): void {}

  _evictOldRecords(now: number = Date.now()): void {
    this._speakingRecords.forEach((record) => {
      const age = now - record.endTimestamp;
      if (age > this.EVICT_MSECS) {
        this._speakingRecords.splice(this._speakingRecords.indexOf(record), 1);
      }
    });
  }
}
