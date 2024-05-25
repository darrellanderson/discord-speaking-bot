import { UserIdToName } from "./user-id-to-name";
import { SpeakingHistoryRecord } from "./speaking-history";

export class SpeakingHistorySummary {
  private readonly _userIdToName: UserIdToName;
  private _characterBudget: number = 1800; // discord message limit 2K
  private _verbose: boolean = false;

  constructor(userIdToName: UserIdToName) {
    this._userIdToName = userIdToName;
  }

  setCharacterBudget(budget: number): this {
    this._characterBudget = budget;
    return this;
  }

  setVerbose(verbose: boolean): this {
    this._verbose = verbose;
    return this;
  }

  summaryAsync(history: Array<SpeakingHistoryRecord>): Promise<string> {
    // Make sure we have all the names before we summarize.
    const userIds: Set<string> = new Set<string>();
    for (const record of history) {
      userIds.add(record.userId);
    }
    const promises: Array<Promise<string>> = [];
    for (const userId of userIds) {
      promises.push(this._userIdToName.getAsync(userId));
    }
    return new Promise<string>((resolve, reject) => {
      Promise.all(promises)
        .then(() => {
          resolve(this.summary(history));
        })
        .catch(reject);
    });
  }

  summary(history: Array<SpeakingHistoryRecord>): string {
    let budget = this._characterBudget;
    const lines: Array<string> = [];
    while (history.length > 0) {
      const record: SpeakingHistoryRecord | undefined = history.pop();
      if (!record) {
        break;
      }
      const timestamp: string = (record.endTimestamp / 1000).toFixed(1);
      const durationSecs: number =
        (record.endTimestamp - record.startTimestamp) / 1000;
      const user: string = this._userIdToName.get(record.userId) ?? "<pending>";
      const line: string = `${timestamp} ${user} ${durationSecs.toFixed(1)}\n`;
      if (line.length > budget) {
        break;
      }
      lines.push(line);
      budget -= line.length + 1; // +1 for newline
    }
    const result = lines.reverse().join("");
    if (this._verbose) {
      console.log(`SpeakingHistorySummary:\n${result}`);
    }
    return result;
  }
}
