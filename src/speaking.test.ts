import { ISpeakingListener, Speaking } from "./speaking";

class TestListener implements ISpeakingListener {
  public readonly events: Array<string> = [];

  onSpeakingConnected(): void {
    this.events.push("connected");
  }

  onSpeakingStart(speaker: string, startTimestamp: number): void {
    this.events.push(`start ${speaker}`);
  }

  onSpeakingEnd(
    speaker: string,
    startTimestamp: number,
    endTimestamp: number
  ): void {
    this.events.push(`end ${speaker}`);
  }

  onSpeakingDisconnected() {
    this.events.push("disconnected");
  }
}

it("constructor", () => {
  new Speaking(new TestListener());
});

it("start/end", () => {
  const listener = new TestListener();
  new Speaking(listener)
    .connect("unittest")
    ._speakingStart("alice")
    ._speakingStart("alice") // duplicate start
    ._speakingEnd("alice")
    ._speakingStart("bob")
    ._speakingEnd("bob")
    ._speakingEnd("bob") // duplicate end
    .disconnect()
    .disconnect(); // duplicate disconnect
  expect(listener.events).toEqual([
    "connected",
    "start alice",
    "end alice",
    "start bob",
    "end bob",
    "disconnected",
  ]);
});
