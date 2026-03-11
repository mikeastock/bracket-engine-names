const STORAGE_VERSION = 2;

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
      slots: [names[index].id, names[index + 1].id],
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

export function createInitialState(names, options = {}) {
  if (!isPowerOfTwo(names.length)) {
    return {
      state: null,
      error: "Enter 2, 4, 8, 16, or another power-of-two number of names.",
    };
  }

  const preparedNames = normalizeNamesForMode(names, options);
  const entries = preparedNames.map((label, index) => ({
    id: `entry-${index + 1}`,
    label,
  }));

  return {
    state: {
      version: STORAGE_VERSION,
      entries,
      rounds: buildInitialBracket(entries),
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

export function renameEntry(state, entryId, nextLabel) {
  const trimmedLabel = nextLabel.trim();

  if (!trimmedLabel) {
    return state;
  }

  return {
    ...state,
    entries: state.entries.map((entry) =>
      entry.id === entryId ? { ...entry, label: trimmedLabel } : entry,
    ),
  };
}

export function serializeState(state) {
  return JSON.stringify(state);
}

export function buildExportPayload(state, exportedAt = new Date().toISOString()) {
  if (!state?.champion) {
    return null;
  }

  const labelsById = new Map(state.entries.map((entry) => [entry.id, entry.label]));

  return {
    exportedAt,
    champion: labelsById.get(state.champion) ?? state.champion,
    names: state.entries.map((entry) => entry.label),
    rounds: state.rounds.map((round) =>
      round.map((matchup) => ({
        slots: matchup.slots.map((slot) => (slot ? (labelsById.get(slot) ?? slot) : null)),
        winner: matchup.winner ? (labelsById.get(matchup.winner) ?? matchup.winner) : null,
      })),
    ),
  };
}

export function exportFileName(champion) {
  const slug = champion
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `name-bracket-${slug || "results"}.json`;
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

  if (!Array.isArray(value.entries) || !isPowerOfTwo(value.entries.length)) {
    return false;
  }

  if (
    !value.entries.every(
      (entry) =>
        entry &&
        typeof entry.id === "string" &&
        entry.id &&
        typeof entry.label === "string" &&
        entry.label.trim(),
    )
  ) {
    return false;
  }

  if (!Array.isArray(value.rounds) || value.rounds.length === 0) {
    return false;
  }

  const entryIds = new Set(value.entries.map((entry) => entry.id));

  if (value.champion !== null && !entryIds.has(value.champion)) {
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
          matchup.slots.every((slot) => slot === null || entryIds.has(slot)) &&
          (matchup.winner === null || entryIds.has(matchup.winner)),
      ),
  );
}

function normalizeNamesForMode(names, options) {
  if (options.mode === "randomize") {
    return shuffleNames(names, options.random ?? Math.random);
  }

  return [...names];
}

function shuffleNames(names, random) {
  const shuffled = [...names];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
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
