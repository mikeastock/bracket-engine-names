import test from "node:test";
import assert from "node:assert/strict";

import {
  advanceWinner,
  buildInitialBracket,
  createInitialState,
  deserializeState,
  isPowerOfTwo,
  parseNames,
  selectWinner,
  serializeState,
} from "./bracket.mjs";

test("parseNames trims lines and removes blanks", () => {
  assert.deepEqual(parseNames("  Ada  \n\nGrace\n  Linus "), {
    names: ["Ada", "Grace", "Linus"],
    error: null,
  });
});

test("isPowerOfTwo accepts bracket counts", () => {
  assert.equal(isPowerOfTwo(2), true);
  assert.equal(isPowerOfTwo(8), true);
  assert.equal(isPowerOfTwo(3), false);
  assert.equal(isPowerOfTwo(0), false);
});

test("createInitialState returns a validation error for non power-of-two lists", () => {
  assert.equal(createInitialState(["Ada", "Grace", "Linus"]).error, "Enter 2, 4, 8, 16, or another power-of-two number of names.");
});

test("buildInitialBracket creates first round matchups from seed order", () => {
  const rounds = buildInitialBracket(["Ada", "Grace", "Linus", "Margaret"]);

  assert.equal(rounds.length, 2);
  assert.deepEqual(rounds[0], [
    { slots: ["Ada", "Grace"], winner: null },
    { slots: ["Linus", "Margaret"], winner: null },
  ]);
  assert.deepEqual(rounds[1], [{ slots: [null, null], winner: null }]);
});

test("advanceWinner writes the selected winner into the next round", () => {
  const rounds = buildInitialBracket(["Ada", "Grace", "Linus", "Margaret"]);
  const advanced = advanceWinner(rounds, 0, 1, "Margaret");

  assert.equal(advanced[0][1].winner, "Margaret");
  assert.deepEqual(advanced[1][0].slots, [null, "Margaret"]);
});

test("advanceWinner updates the champion after the final pick", () => {
  let rounds = buildInitialBracket(["Ada", "Grace"]);
  rounds = advanceWinner(rounds, 0, 0, "Ada");

  assert.equal(rounds[0][0].winner, "Ada");
});

test("selectWinner clears downstream picks when an earlier result changes", () => {
  let state = createInitialState(["Ada", "Grace", "Linus", "Margaret"]).state;
  state = selectWinner(state, 0, 0, "Ada");
  state = selectWinner(state, 0, 1, "Margaret");
  state = selectWinner(state, 1, 0, "Ada");

  state = selectWinner(state, 0, 0, "Grace");

  assert.equal(state.rounds[0][0].winner, "Grace");
  assert.deepEqual(state.rounds[1][0].slots, ["Grace", "Margaret"]);
  assert.equal(state.rounds[1][0].winner, null);
  assert.equal(state.champion, null);
});

test("serializeState and deserializeState round-trip valid state", () => {
  const state = createInitialState(["Ada", "Grace", "Linus", "Margaret"]).state;
  const raw = serializeState(state);

  assert.deepEqual(deserializeState(raw), state);
});

test("deserializeState rejects invalid payloads", () => {
  assert.equal(deserializeState('{"bad":true}'), null);
  assert.equal(deserializeState("not-json"), null);
});
