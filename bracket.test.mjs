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
  renameEntry,
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
  assert.deepEqual(
    result.state.entries.map((entry) => entry.label),
    ["Linus", "Ada", "Grace", "Margaret"],
  );
  assert.deepEqual(result.state.rounds[0], [
    { slots: ["entry-1", "entry-2"], winner: null },
    { slots: ["entry-3", "entry-4"], winner: null },
  ]);
});

test("createInitialState randomize mode does not mutate the input names", () => {
  const names = ["Ada", "Grace", "Linus", "Margaret"];

  createInitialState(names, { mode: "randomize", random: () => 0 });

  assert.deepEqual(names, ["Ada", "Grace", "Linus", "Margaret"]);
});

test("buildInitialBracket creates first round matchups from seed order", () => {
  const rounds = buildInitialBracket([
    { id: "entry-1", label: "Ada" },
    { id: "entry-2", label: "Grace" },
    { id: "entry-3", label: "Linus" },
    { id: "entry-4", label: "Margaret" },
  ]);

  assert.equal(rounds.length, 2);
  assert.deepEqual(rounds[0], [
    { slots: ["entry-1", "entry-2"], winner: null },
    { slots: ["entry-3", "entry-4"], winner: null },
  ]);
  assert.deepEqual(rounds[1], [{ slots: [null, null], winner: null }]);
});

test("advanceWinner writes the selected winner into the next round", () => {
  const rounds = buildInitialBracket([
    { id: "entry-1", label: "Ada" },
    { id: "entry-2", label: "Grace" },
    { id: "entry-3", label: "Linus" },
    { id: "entry-4", label: "Margaret" },
  ]);
  const advanced = advanceWinner(rounds, 0, 1, "entry-4");

  assert.equal(advanced[0][1].winner, "entry-4");
  assert.deepEqual(advanced[1][0].slots, [null, "entry-4"]);
});

test("advanceWinner updates the champion after the final pick", () => {
  let rounds = buildInitialBracket([
    { id: "entry-1", label: "Ada" },
    { id: "entry-2", label: "Grace" },
  ]);
  rounds = advanceWinner(rounds, 0, 0, "entry-1");

  assert.equal(rounds[0][0].winner, "entry-1");
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

test("renameEntry updates every visible occurrence of the edited entrant", () => {
  let state = createInitialState(["Ada", "Grace", "Linus", "Margaret"]).state;
  const adaId = state.entries[0].id;
  const margaretId = state.entries[3].id;
  state = selectWinner(state, 0, 0, adaId);
  state = selectWinner(state, 0, 1, margaretId);
  state = selectWinner(state, 1, 0, adaId);

  state = renameEntry(state, adaId, "Ada Lovelace");

  assert.equal(state.entries[0].label, "Ada Lovelace");
  assert.equal(state.champion, adaId);
  assert.deepEqual(buildExportPayload(state, "2026-03-11T12:00:00.000Z"), {
    exportedAt: "2026-03-11T12:00:00.000Z",
    champion: "Ada Lovelace",
    names: ["Ada Lovelace", "Grace", "Linus", "Margaret"],
    rounds: [
      [
        { slots: ["Ada Lovelace", "Grace"], winner: "Ada Lovelace" },
        { slots: ["Linus", "Margaret"], winner: "Margaret" },
      ],
      [{ slots: ["Ada Lovelace", "Margaret"], winner: "Ada Lovelace" }],
    ],
  });
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
  assert.deepEqual(result.state.rounds[0][0].slots, ["entry-1", "entry-2"]);
  assert.deepEqual(result.state.rounds[0].at(-1).slots, ["entry-63", "entry-64"]);
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
    rounds: [
      [
        { slots: ["Ada", "Grace"], winner: "Ada" },
        { slots: ["Linus", "Margaret"], winner: "Margaret" },
      ],
      [{ slots: ["Ada", "Margaret"], winner: "Ada" }],
    ],
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
