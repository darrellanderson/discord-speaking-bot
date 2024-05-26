import { DiscordPutGet } from "./discord-put-get";
import { WEBHOOK_ID, WEBHOOK_TOKEN } from "../secret.json";

it("put, get, dele", async () => {
  const message = "Hello, world!";
  const speakingFetch = new DiscordPutGet()
    .setId(WEBHOOK_ID)
    .setToken(WEBHOOK_TOKEN);
  const messageId: string = await speakingFetch.put(message);
  expect(messageId).toBeTruthy();

  const content: string = await speakingFetch.get(messageId);
  expect(content).toEqual(message);

  await speakingFetch.dele(messageId);
});
