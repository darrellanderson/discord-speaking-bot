import { ISpeakingHistoryListener, SpeakingHistory } from "./speaking-history";

class TestListener implements ISpeakingHistoryListener {
  onSpeakingHistoryUpdated(speakingHistory: SpeakingHistory): void {}
  onSpeakingHistoryDisconnected(): void {}
}

it("constructor", () => {
  new SpeakingHistory(new TestListener());
});

it("summary", () => {
  const speakingHistory = new SpeakingHistory(new TestListener());
  speakingHistory.onSpeakingStart("alice");
  speakingHistory.onSpeakingStart("bob");
  speakingHistory.onSpeakingEnd("bob");
  speakingHistory.onSpeakingEnd("alice");
  speakingHistory.onSpeakingEnd("charlie"); // not started, ignored
  speakingHistory.onSpeakingStart("dennis"); // no end, excluded
  const history = speakingHistory.history().map((record) => record.userId);
  const timestamp = (Date.now() / 1000).toFixed(1);
  expect(history).toEqual(["bob", "alice"]); // in order
});
