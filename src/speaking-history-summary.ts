import { Client } from "discord.js";
import { UserIdToName } from "./user-id-to-name";
import { SpeakingHistoryRecord } from "./speaking-history";

export class SpeakingHistorySummary {
  private readonly _userIdToName: UserIdToName;
  private _characterBudget: number = 1950; // discord message limit 2K

  constructor(userIdToName: UserIdToName) {
    this._userIdToName = userIdToName;
  }

  summary(history: Array<SpeakingHistoryRecord>): string {
    let budget = this._characterBudget;
    const lines: Array<string> = [];
    for (const record of history) {
      const durationSecs: number =
        (record.endTimestamp - record.startTimestamp) / 1000;
      const user: string = this._userIdToName.get(record.userId) ?? "<pending>";
      const line: string = `${user} ${durationSecs.toFixed(1)}\n`;
      if (line.length > budget) {
        break;
      }
      lines.push(line);
      budget -= line.length + 1; // +1 for newline
    }
    return lines.join("");
  }
}
