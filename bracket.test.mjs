import test from "node:test";
import assert from "node:assert/strict";

import {
  advanceWinner,
  buildExportPayload,
  buildInitialBracket,
  createInitialState,
  deserializeState,
  exportFileName,
  isPowerOfTwo,
  parseNames,
  selectWinner,
  serializeState,
} from "./bracket.mjs";
import { DEFAULT_NAMES_TEXT } from "./default-names.mjs";

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

test("createInitialState randomize mode shuffles names before building the bracket", () => {
  const randomValues = [0.75, 0.5, 0.25];
  const nextRandom = () => randomValues.shift() ?? 0;
  const names = ["Ada", "Grace", "Linus", "Margaret"];

  const result = createInitialState(names, { mode: "randomize", random: nextRandom });

  assert.equal(result.error, null);
  assert.deepEqual(result.state.names, ["Linus", "Ada", "Grace", "Margaret"]);
  assert.deepEqual(result.state.rounds[0], [
    { slots: ["Linus", "Ada"], winner: null },
    { slots: ["Grace", "Margaret"], winner: null },
  ]);
});

test("createInitialState randomize mode does not mutate the input names", () => {
  const names = ["Ada", "Grace", "Linus", "Margaret"];

  createInitialState(names, { mode: "randomize", random: () => 0 });

  assert.deepEqual(names, ["Ada", "Grace", "Linus", "Margaret"]);
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

test("default names produce a valid 64-name opening bracket", () => {
  const { names } = parseNames(DEFAULT_NAMES_TEXT);
  const result = createInitialState(names);

  assert.equal(names.length, 64);
  assert.equal(result.error, null);
  assert.equal(result.state.rounds.length, 6);
  assert.deepEqual(result.state.rounds[0][0].slots, ["Torque", "Spotter"]);
  assert.deepEqual(result.state.rounds[0].at(-1).slots, ["Volt", "Flux"]);
});

test("buildExportPayload returns completed bracket results", () => {
  let state = createInitialState(["Ada", "Grace", "Linus", "Margaret"]).state;
  state = selectWinner(state, 0, 0, "Ada");
  state = selectWinner(state, 0, 1, "Margaret");
  state = selectWinner(state, 1, 0, "Ada");

  const payload = buildExportPayload(state, "2026-03-11T12:00:00.000Z");

  assert.deepEqual(payload, {
    exportedAt: "2026-03-11T12:00:00.000Z",
    champion: "Ada",
    names: ["Ada", "Grace", "Linus", "Margaret"],
    rounds: state.rounds,
  });
});

test("buildExportPayload rejects incomplete brackets", () => {
  const state = createInitialState(["Ada", "Grace", "Linus", "Margaret"]).state;

  assert.equal(buildExportPayload(state, "2026-03-11T12:00:00.000Z"), null);
});

test("exportFileName slugifies the champion name", () => {
  assert.equal(exportFileName("Ada Lovelace"), "name-bracket-ada-lovelace.json");
  assert.equal(exportFileName("DRS"), "name-bracket-drs.json");
});
