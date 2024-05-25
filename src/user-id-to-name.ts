import { Client } from "discord.js";

export class UserIdToName {
  private readonly _client: Client;
  private readonly _userIdToName: Map<string, string> = new Map();

  constructor(client: Client) {
    this._client = client;
  }

  get(userId: string): string | undefined {
    const name: string | undefined = this._userIdToName.get(userId);

    if (!name) {
      this.getAsync(userId).then((name: string): void => {
        this._userIdToName.set(userId, name);
      });
    }

    return name;
  }

  async getAsync(userId: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const name: string | undefined = this._userIdToName.get(userId);
      if (name) {
        resolve(name);
        return;
      }
      this._client.users
        .fetch(userId)
        .then((user) => {
          const name: string = user.displayName;
          this._userIdToName.set(userId, name);
          resolve(name);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }
}
