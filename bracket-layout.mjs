const DEFAULT_LAYOUT = {
  cardHeight: 88,
  rowGap: 18,
  columnWidth: 224,
  columnGap: 56,
  topPadding: 60,
  bottomPadding: 40,
};

export function buildBracketLayout(rounds, options = {}) {
  const settings = { ...DEFAULT_LAYOUT, ...options };
  const roundLayouts = [];

  roundLayouts[0] = rounds[0].map((_, matchupIndex) => {
    const top = settings.topPadding + matchupIndex * (settings.cardHeight + settings.rowGap);
    return { top, center: top + settings.cardHeight / 2 };
  });

  for (let roundIndex = 1; roundIndex < rounds.length; roundIndex += 1) {
    roundLayouts[roundIndex] = rounds[roundIndex].map((_, matchupIndex) => {
      const firstChild = roundLayouts[roundIndex - 1][matchupIndex * 2];
      const secondChild = roundLayouts[roundIndex - 1][matchupIndex * 2 + 1];
      const center = (firstChild.center + secondChild.center) / 2;
      return {
        top: center - settings.cardHeight / 2,
        center,
      };
    });
  }

  const height = roundLayouts[0].at(-1).top + settings.cardHeight + settings.bottomPadding;
  const width = rounds.length * settings.columnWidth + (rounds.length - 1) * settings.columnGap;

  return {
    ...settings,
    height,
    rounds: roundLayouts,
    width,
  };
}

export function buildConnector(layout, roundIndex, matchupIndex) {
  if (roundIndex >= layout.rounds.length - 1) {
    return null;
  }

  const current = layout.rounds[roundIndex][matchupIndex];
  const next = layout.rounds[roundIndex + 1][Math.floor(matchupIndex / 2)];
  const currentRight = roundIndex * (layout.columnWidth + layout.columnGap) + layout.columnWidth;
  const nextLeft = (roundIndex + 1) * (layout.columnWidth + layout.columnGap);
  const midpointLeft = currentRight + layout.columnGap / 2;

  return {
    horizontalStart: {
      left: currentRight,
      top: current.center,
      width: midpointLeft - currentRight,
    },
    vertical: {
      left: midpointLeft,
      top: Math.min(current.center, next.center),
      height: Math.abs(next.center - current.center),
    },
    horizontalEnd: {
      left: midpointLeft,
      top: next.center,
      width: nextLeft - midpointLeft,
    },
  };
}
