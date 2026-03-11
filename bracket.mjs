const STORAGE_VERSION = 1;

export function parseNames(rawText) {
  const names = rawText
    .split("\n")
    .map((name) => name.trim())
    .filter(Boolean);

  return { names, error: null };
}

export function isPowerOfTwo(count) {
  return count >= 2 && (count & (count - 1)) === 0;
}

export function buildInitialBracket(names) {
  const rounds = [];
  let currentRound = [];

  for (let index = 0; index < names.length; index += 2) {
    currentRound.push({
      slots: [names[index], names[index + 1]],
      winner: null,
    });
  }

  rounds.push(currentRound);

  while (currentRound.length > 1) {
    const nextRound = Array.from({ length: currentRound.length / 2 }, () => ({
      slots: [null, null],
      winner: null,
    }));

    rounds.push(nextRound);
    currentRound = nextRound;
  }

  return rounds;
}

export function createInitialState(names) {
  if (!isPowerOfTwo(names.length)) {
    return {
      state: null,
      error: "Enter 2, 4, 8, 16, or another power-of-two number of names.",
    };
  }

  return {
    state: {
      version: STORAGE_VERSION,
      names,
      rounds: buildInitialBracket(names),
      champion: null,
    },
    error: null,
  };
}

export function advanceWinner(rounds, roundIndex, matchupIndex, winnerName) {
  const nextRounds = rounds.map((round) =>
    round.map((matchup) => ({
      slots: [...matchup.slots],
      winner: matchup.winner,
    })),
  );

  nextRounds[roundIndex][matchupIndex].winner = winnerName;
  propagateForward(nextRounds, roundIndex, matchupIndex);

  return nextRounds;
}

export function selectWinner(state, roundIndex, matchupIndex, winnerName) {
  const rounds = advanceWinner(state.rounds, roundIndex, matchupIndex, winnerName);
  const champion = rounds.at(-1)?.[0]?.winner ?? null;

  return {
    ...state,
    rounds,
    champion,
  };
}

export function serializeState(state) {
  return JSON.stringify(state);
}

export function deserializeState(raw) {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!isValidState(parsed)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function isValidState(value) {
  if (!value || typeof value !== "object") {
    return false;
  }

  if (value.version !== STORAGE_VERSION) {
    return false;
  }

  if (!Array.isArray(value.names) || !isPowerOfTwo(value.names.length)) {
    return false;
  }

  if (!Array.isArray(value.rounds) || value.rounds.length === 0) {
    return false;
  }

  return value.rounds.every(
    (round) =>
      Array.isArray(round) &&
      round.every(
        (matchup) =>
          matchup &&
          Array.isArray(matchup.slots) &&
          matchup.slots.length === 2 &&
          ("winner" in matchup),
      ),
  );
}

function propagateForward(rounds, roundIndex, matchupIndex) {
  if (roundIndex === rounds.length - 1) {
    return;
  }

  const matchup = rounds[roundIndex][matchupIndex];
  const nextMatchupIndex = Math.floor(matchupIndex / 2);
  const nextSlotIndex = matchupIndex % 2;
  const nextMatchup = rounds[roundIndex + 1][nextMatchupIndex];

  nextMatchup.slots[nextSlotIndex] = matchup.winner;

  if (nextMatchup.winner && !nextMatchup.slots.includes(nextMatchup.winner)) {
    nextMatchup.winner = null;
  }

  propagateForward(rounds, roundIndex + 1, nextMatchupIndex);
}
