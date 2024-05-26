import { ISpeakingListener, Speaking } from "./speaking";

class TestListener implements ISpeakingListener {
  public readonly events: Array<string> = [];

  onSpeakingStart(speaker: string): void {
    this.events.push(`start ${speaker}`);
  }

  onSpeakingEnd(speaker: string): void {
    this.events.push(`end ${speaker}`);
  }
}

it("constructor", () => {
  new Speaking(new TestListener());
});

it("start/end", () => {
  const listener = new TestListener();
  new Speaking(listener)
    ._speakingStart("alice")
    ._speakingStart("alice") // duplicate start
    ._speakingEnd("alice")
    ._speakingStart("bob")
    ._speakingEnd("bob")
    ._speakingEnd("bob"); // duplicate end
  expect(listener.events).toEqual([
    "start alice",
    "end alice",
    "start bob",
    "end bob",
  ]);
});
