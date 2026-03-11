import test from "node:test";
import assert from "node:assert/strict";

import { buildBracketLayout, buildConnector } from "./bracket-layout.mjs";

test("buildBracketLayout centers later rounds between earlier matchups", () => {
  const rounds = [
    [{}, {}, {}, {}],
    [{}, {}],
    [{}],
  ];

  const layout = buildBracketLayout(rounds, {
    cardHeight: 100,
    rowGap: 20,
    columnWidth: 200,
    columnGap: 60,
    topPadding: 40,
  });

  assert.deepEqual(layout.rounds.map((round) => round.map((matchup) => matchup.top)), [
    [40, 160, 280, 400],
    [100, 340],
    [220],
  ]);
  assert.equal(layout.width, 720);
  assert.equal(layout.height, 540);
});

test("buildConnector creates elbow lines between rounds", () => {
  const rounds = [
    [{}, {}],
    [{}],
  ];

  const layout = buildBracketLayout(rounds, {
    cardHeight: 80,
    rowGap: 24,
    columnWidth: 180,
    columnGap: 40,
    topPadding: 32,
  });

  assert.deepEqual(buildConnector(layout, 0, 0), {
    horizontalStart: { left: 180, top: 72, width: 20 },
    vertical: { left: 200, top: 72, height: 52 },
    horizontalEnd: { left: 200, top: 124, width: 20 },
  });
});
