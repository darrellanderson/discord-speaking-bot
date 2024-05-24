import { ISpeakingHistoryListener, SpeakingHistory } from "./speaking-history";

class TestListener implements ISpeakingHistoryListener {
  onSpeakingHistoryUpdated(speakingHistory: SpeakingHistory): void {}
  onSpeakingHistoryDisconnected(): void {}
}

it("constructor", () => {
  new SpeakingHistory(new TestListener());
});

it("summary", () => {
  const history = new SpeakingHistory(new TestListener());
  history.onSpeakingStart("alice");
  history.onSpeakingStart("bob");
  history.onSpeakingEnd("bob");
  history.onSpeakingEnd("alice");
  history.onSpeakingEnd("charlie");
  history.onSpeakingStart("dennis");
  const summary = history.summary();
  const timestamp = (Date.now() / 1000).toFixed(1);
  expect(summary).toEqual(
    [`${timestamp} alice 0.0`, `${timestamp} bob 0.0`].join("\n")
  );
});
