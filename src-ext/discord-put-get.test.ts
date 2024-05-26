import { DiscordPutGet } from "./discord-put-get";
import { WEBHOOK_ID, WEBHOOK_TOKEN } from "../secret.json";

it("put, get, dele", async () => {
  const message = "Hello, world!";
  const speakingFetch = new DiscordPutGet()
    .setId(WEBHOOK_ID)
    .setToken(WEBHOOK_TOKEN);
  const messageId: string = await speakingFetch.put(message);
  expect(messageId).toBeTruthy();

  console.log("messageId", messageId);

  const content: string = await speakingFetch.get(messageId);
  expect(content).toEqual(message);

  //await speakingFetch.dele(messageId);
});

it("get other", async () => {
  const speakingFetch = new DiscordPutGet()
    .setId(WEBHOOK_ID)
    .setToken(WEBHOOK_TOKEN);

  const messageId = "1244134096867823677";
  const content: string = await speakingFetch.get(messageId);
  console.log("OTHERS", content);
});
