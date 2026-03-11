import React, { useEffect, useState } from "https://esm.sh/react@19.0.0";
import { createRoot } from "https://esm.sh/react-dom@19.0.0/client";

import {
  createInitialState,
  deserializeState,
  parseNames,
  selectWinner,
  serializeState,
} from "./bracket.mjs";

const STORAGE_KEY = "name-bracket-state";
const h = React.createElement;

function App() {
  const [state, setState] = useState(loadSavedState);
  const [rawNames, setRawNames] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!state) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, serializeState(state));
  }, [state]);

  function handleImport(event) {
    event.preventDefault();

    const parsed = parseNames(rawNames);
    const result = createInitialState(parsed.names);

    if (result.error) {
      setError(result.error);
      return;
    }

    setState(result.state);
    setError("");
  }

  function handleWinner(roundIndex, matchupIndex, winnerName) {
    setState((currentState) => selectWinner(currentState, roundIndex, matchupIndex, winnerName));
  }

  function handleReset() {
    setState(null);
    setRawNames("");
    setError("");
  }

  return h(
    "main",
    { className: "mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8" },
    h(Header, { hasBracket: Boolean(state), onReset: handleReset }),
    state
      ? h(BracketView, {
          state,
          onSelectWinner: handleWinner,
        })
      : h(ImportForm, {
          error,
          rawNames,
          onChange: setRawNames,
          onSubmit: handleImport,
        }),
  );
}

function Header({ hasBracket, onReset }) {
  return h(
    "header",
    { className: "mb-8 flex flex-col gap-4 border-b border-stone-300 pb-6 sm:flex-row sm:items-end sm:justify-between" },
    h(
      "div",
      { className: "space-y-2" },
      h("p", { className: "text-sm font-semibold uppercase tracking-[0.3em] text-amber-700" }, "Name Bracket"),
      h("h1", { className: "text-4xl font-black tracking-tight text-stone-900 sm:text-5xl" }, "Pick a winner, one matchup at a time."),
      h(
        "p",
        { className: "max-w-2xl text-sm leading-6 text-stone-600 sm:text-base" },
        hasBracket
          ? "Your bracket is saved in local storage. Reloading the page keeps the current tournament."
          : "Paste one name per line. The list must contain 2, 4, 8, 16, or another power-of-two number of names.",
      ),
    ),
    hasBracket
      ? h(
          "button",
          {
            type: "button",
            className:
              "inline-flex items-center justify-center rounded-full border border-stone-900 px-5 py-3 text-sm font-semibold text-stone-900 transition hover:bg-stone-900 hover:text-amber-50",
            onClick: onReset,
          },
          "Reset bracket",
        )
      : null,
  );
}

function ImportForm({ error, rawNames, onChange, onSubmit }) {
  return h(
    "section",
    { className: "mx-auto w-full max-w-3xl rounded-[2rem] border border-stone-300 bg-white p-6 shadow-[0_20px_60px_-30px_rgba(68,64,60,0.35)] sm:p-8" },
    h(
      "form",
      { className: "space-y-5", onSubmit },
      h(
        "div",
        { className: "space-y-2" },
        h("label", { htmlFor: "names", className: "block text-sm font-semibold text-stone-700" }, "Names"),
        h("textarea", {
          id: "names",
          className:
            "min-h-72 w-full rounded-[1.5rem] border border-stone-300 bg-stone-50 px-4 py-4 font-medium text-stone-900 outline-none transition focus:border-amber-600",
          placeholder: "Ada Lovelace\nGrace Hopper\nMargaret Hamilton\nLinus Torvalds",
          value: rawNames,
          onChange: (event) => onChange(event.target.value),
        }),
      ),
      error
        ? h(
            "p",
            { className: "rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" },
            error,
          )
        : null,
      h(
        "button",
        {
          type: "submit",
          className:
            "inline-flex items-center justify-center rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-amber-50 transition hover:bg-amber-700",
        },
        "Build bracket",
      ),
    ),
  );
}

function BracketView({ state, onSelectWinner }) {
  return h(
    "section",
    { className: "space-y-6" },
    state.champion
      ? h(
          "div",
          { className: "rounded-[2rem] bg-stone-900 px-6 py-5 text-amber-50 shadow-[0_24px_80px_-32px_rgba(28,25,23,0.75)]" },
          h("p", { className: "text-sm font-semibold uppercase tracking-[0.3em] text-amber-300" }, "Chosen Name"),
          h("p", { className: "mt-2 text-3xl font-black tracking-tight sm:text-4xl" }, state.champion),
        )
      : h(
          "div",
          { className: "rounded-[2rem] border border-amber-300 bg-amber-100 px-6 py-5" },
          h("p", { className: "text-sm font-semibold uppercase tracking-[0.3em] text-amber-800" }, "In Progress"),
          h("p", { className: "mt-2 text-lg font-semibold text-amber-950" }, "Click a name in any matchup to advance it."),
        ),
    h(
      "div",
      { className: "overflow-x-auto pb-4" },
      h(
        "div",
        { className: "flex min-w-max gap-4 sm:gap-6" },
        ...state.rounds.map((round, roundIndex) =>
          h(
            "section",
            {
              key: `round-${roundIndex}`,
              className: "flex w-72 shrink-0 flex-col gap-4 rounded-[2rem] border border-stone-300 bg-white p-4 shadow-[0_16px_50px_-30px_rgba(41,37,36,0.45)]",
            },
            h(
              "div",
              { className: "border-b border-stone-200 pb-3" },
              h("p", { className: "text-xs font-semibold uppercase tracking-[0.3em] text-stone-500" }, roundLabel(state.rounds.length, roundIndex)),
              h("p", { className: "mt-1 text-sm text-stone-600" }, `${round.length} matchup${round.length === 1 ? "" : "s"}`),
            ),
            ...round.map((matchup, matchupIndex) =>
              h(MatchupCard, {
                key: `matchup-${roundIndex}-${matchupIndex}`,
                matchup,
                onSelect: (winnerName) => onSelectWinner(roundIndex, matchupIndex, winnerName),
              }),
            ),
          ),
        ),
      ),
    ),
  );
}

function MatchupCard({ matchup, onSelect }) {
  return h(
    "article",
    { className: "space-y-3 rounded-[1.5rem] bg-stone-50 p-3" },
    ...matchup.slots.map((name, slotIndex) =>
      h(
        "button",
        {
          key: `${name ?? "empty"}-${slotIndex}`,
          type: "button",
          disabled: !name,
          className: buttonClassName(matchup.winner === name, !name),
          onClick: () => name && onSelect(name),
        },
        name ?? "Waiting for winner",
      ),
    ),
  );
}

function buttonClassName(isWinner, isEmpty) {
  const classes = [
    "w-full rounded-[1.25rem] px-4 py-3 text-left text-sm font-semibold transition",
  ];

  if (isEmpty) {
    classes.push("cursor-not-allowed border border-dashed border-stone-300 bg-white text-stone-400");
    return classes.join(" ");
  }

  if (isWinner) {
    classes.push("bg-amber-500 text-stone-950 shadow-[inset_0_0_0_1px_rgba(120,53,15,0.2)]");
    return classes.join(" ");
  }

  classes.push("bg-white text-stone-800 shadow-[inset_0_0_0_1px_rgba(214,211,209,1)] hover:bg-stone-900 hover:text-amber-50");
  return classes.join(" ");
}

function roundLabel(roundCount, roundIndex) {
  if (roundIndex === roundCount - 1) {
    return "Final";
  }

  return `Round ${roundIndex + 1}`;
}

function loadSavedState() {
  const savedState = deserializeState(window.localStorage.getItem(STORAGE_KEY));

  if (!savedState) {
    window.localStorage.removeItem(STORAGE_KEY);
  }

  return savedState;
}

createRoot(document.getElementById("app")).render(h(App));
