import { TimeSpanRecord, TimeSpans } from "./time-span";

export class SpeakingAssignRecord extends TimeSpanRecord {
  public readonly defaultUser: string | undefined;
  public readonly speakers: Array<string> = [];

  constructor(start: number, end: number, defaultUser: string | undefined) {
    super(start, end);
    this.defaultUser = defaultUser;
  }

  clone(start: number, end: number): TimeSpanRecord {
    const clone = new SpeakingAssignRecord(start, end, this.defaultUser);
    clone.speakers.push(...this.speakers);
    return clone;
  }

  toString(): string {
    return `[${this.start}:${this.end}] ${
      this.defaultUser
    } {${this.speakers.join(",")}}`;
  }
}

/**
 * Spans get assigned a default user (the current turn, may be undefined).
 * Speaking events carve up and add speakers to spans.
 */
export class SpeakingAssign {
  private readonly _spans: TimeSpans<SpeakingAssignRecord> = new TimeSpans();

  constructor() {
    this._spans.add(new SpeakingAssignRecord(0, Infinity, undefined));
  }

  getSpans(): Array<SpeakingAssignRecord> {
    return this._spans.getSpans();
  }

  addChangeTurn(name: string | undefined, timestamp: number): this {
    this._spans.clampLast(timestamp);
    this._spans.add(new SpeakingAssignRecord(timestamp, Infinity, name));
    return this;
  }

  addSpeaking(
    name: string,
    start: number,
    end: number
  ): Array<SpeakingAssignRecord> {
    const result: Array<SpeakingAssignRecord> = [];

    // Split any existing spans at the speaking start/end times.
    this._spans.split(start);
    this._spans.split(end);

    // Add this new speaker to the matching spans.
    const overlaps: Array<SpeakingAssignRecord> = this._spans.overlaps(
      start,
      end
    );
    for (const overlap of overlaps) {
      if (overlap.defaultUser === name) {
        continue; // do not count the default user as a speaker
      }
      if (overlap.speakers.includes(name)) {
        continue; // do not count the same speaker twice
      }
      overlap.speakers.push(name);
      result.push(overlap);
    }
    return result;
  }
}
