import { SpeakingAssign, SpeakingAssignRecord } from "./speaking-assign";

it("speaking assign record clone", () => {
  const record = new SpeakingAssignRecord(1, 2, "default");
  record.speakers.push("a", "b");
  expect(record.start).toBe(1);
  expect(record.end).toBe(2);
  expect(record.defaultUser).toBe("default");
  expect(record.speakers).toEqual(["a", "b"]);

  const clone = record.clone(3, 4) as SpeakingAssignRecord;
  expect(clone.start).toBe(3);
  expect(clone.end).toBe(4);
  expect(clone.defaultUser).toBe("default");
  expect(clone.speakers).toEqual(["a", "b"]);
});

it("speaking assign add change turn", () => {
  const assign = new SpeakingAssign();
  expect(assign.getSpans().map((span) => span.toString())).toEqual([
    "[0:Infinity] undefined {}",
  ]);

  assign.addChangeTurn("a", 1);
  expect(assign.getSpans().map((span) => span.toString())).toEqual([
    "[0:1] undefined {}",
    "[1:Infinity] a {}",
  ]);
});

it("speaking assign add speaking", () => {
  const assign = new SpeakingAssign();
  expect(assign.getSpans().map((span) => span.toString())).toEqual([
    "[0:Infinity] undefined {}",
  ]);

  assign.addSpeaking("a", 1, 2);
  expect(assign.getSpans().map((span) => span.toString())).toEqual([
    "[0:1] undefined {}",
    "[1:2] undefined {a}",
    "[2:Infinity] undefined {}",
  ]);

  assign.addSpeaking("b", 1, 3);
  expect(assign.getSpans().map((span) => span.toString())).toEqual([
    "[0:1] undefined {}",
    "[1:2] undefined {a,b}",
    "[2:3] undefined {b}",
    "[3:Infinity] undefined {}",
  ]);

  assign.addSpeaking("c", 2, 3);
  expect(assign.getSpans().map((span) => span.toString())).toEqual([
    "[0:1] undefined {}",
    "[1:2] undefined {a,b}",
    "[2:3] undefined {b,c}",
    "[3:Infinity] undefined {}",
  ]);
});
