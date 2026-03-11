import React, { useEffect, useState } from "https://esm.sh/react@19.0.0";
import { createRoot } from "https://esm.sh/react-dom@19.0.0/client";
import { buildBracketLayout, buildConnector } from "./bracket-layout.mjs";

import {
  buildExportPayload,
  createInitialState,
  deserializeState,
  exportFileName,
  parseNames,
  selectWinner,
  serializeState,
} from "./bracket.mjs";
import { DEFAULT_NAMES_TEXT } from "./default-names.mjs";

const STORAGE_KEY = "name-bracket-state";
const THEME_STORAGE_KEY = "name-bracket-theme";
const BRACKET_LAYOUT = {
  cardHeight: 88,
  rowGap: 18,
  columnWidth: 224,
  columnGap: 56,
  topPadding: 60,
  bottomPadding: 40,
};
const h = React.createElement;

function App() {
  const [state, setState] = useState(loadSavedState);
  const [rawNames, setRawNames] = useState(DEFAULT_NAMES_TEXT);
  const [buildMode, setBuildMode] = useState("seeded");
  const [error, setError] = useState("");
  const [theme, setTheme] = useState(loadTheme);

  useEffect(() => {
    if (!state) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, serializeState(state));
  }, [state]);

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    document.body.className =
      theme === "dark"
        ? "min-h-screen bg-stone-950 text-stone-100"
        : "min-h-screen bg-amber-50 text-stone-900";
  }, [theme]);

  function handleImport(event) {
    event.preventDefault();

    const parsed = parseNames(rawNames);
    const result = createInitialState(parsed.names, { mode: buildMode });

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
    setRawNames(DEFAULT_NAMES_TEXT);
    setBuildMode("seeded");
    setError("");
  }

  function handleExport() {
    const payload = buildExportPayload(state);
    if (!payload) {
      return;
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = exportFileName(payload.champion);
    link.click();
    window.URL.revokeObjectURL(url);
  }

  function handleThemeToggle() {
    setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));
  }

  return h(
    "main",
    {
      className: `flex min-h-screen w-full flex-col px-4 py-8 transition-colors sm:px-6 lg:px-8 ${
        theme === "dark" ? "bg-stone-950 text-stone-100" : "bg-amber-50 text-stone-900"
      }`,
    },
    h(Header, { hasBracket: Boolean(state), onReset: handleReset, onToggleTheme: handleThemeToggle, theme }),
    state
      ? h(BracketView, {
          onExport: handleExport,
          state,
          theme,
          onSelectWinner: handleWinner,
        })
      : h(ImportForm, {
          buildMode,
          error,
          rawNames,
          theme,
          onBuildModeChange: setBuildMode,
          onChange: setRawNames,
          onSubmit: handleImport,
        }),
  );
}

function Header({ hasBracket, onReset, onToggleTheme, theme }) {
  return h(
    "header",
    {
      className: `mb-8 flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between ${
        theme === "dark" ? "border-stone-800" : "border-stone-300"
      }`,
    },
    h(
      "div",
      { className: "space-y-2" },
      h("p", { className: "text-sm font-semibold uppercase tracking-[0.3em] text-amber-700" }, "Name Bracket"),
      h(
        "h1",
        { className: `text-4xl font-black tracking-tight sm:text-5xl ${theme === "dark" ? "text-stone-100" : "text-stone-900"}` },
        "Pick a winner, one matchup at a time.",
      ),
      h(
        "p",
        { className: `max-w-2xl text-sm leading-6 sm:text-base ${theme === "dark" ? "text-stone-400" : "text-stone-600"}` },
        hasBracket
          ? "Your bracket is saved in local storage. Reloading the page keeps the current tournament."
          : "Paste one name per line. The list must contain 2, 4, 8, 16, or another power-of-two number of names.",
      ),
    ),
    h(
      "div",
      { className: "flex flex-col items-start gap-3 sm:items-end" },
      h(
        "button",
        {
          type: "button",
          className:
            theme === "dark"
              ? "inline-flex items-center justify-center rounded-full border border-stone-600 bg-stone-900 px-5 py-3 text-sm font-semibold text-stone-100 transition hover:bg-stone-800"
              : "inline-flex items-center justify-center rounded-full border border-stone-900 px-5 py-3 text-sm font-semibold text-stone-900 transition hover:bg-stone-900 hover:text-amber-50",
          onClick: onToggleTheme,
        },
        theme === "dark" ? "Light mode" : "Dark mode",
      ),
      hasBracket
        ? h(
            "button",
            {
              type: "button",
              className:
                theme === "dark"
                  ? "inline-flex items-center justify-center rounded-full border border-stone-600 px-5 py-3 text-sm font-semibold text-stone-200 transition hover:bg-stone-900"
                  : "inline-flex items-center justify-center rounded-full border border-stone-900 px-5 py-3 text-sm font-semibold text-stone-900 transition hover:bg-stone-900 hover:text-amber-50",
              onClick: onReset,
            },
            "Reset bracket",
          )
        : null,
    ),
  );
}

function ImportForm({ buildMode, error, rawNames, theme, onBuildModeChange, onChange, onSubmit }) {
  return h(
    "section",
    {
      className: `mx-auto w-full max-w-3xl rounded-[2rem] border p-6 shadow-[0_20px_60px_-30px_rgba(68,64,60,0.35)] sm:p-8 ${
        theme === "dark" ? "border-stone-800 bg-stone-900" : "border-stone-300 bg-white"
      }`,
    },
    h(
      "form",
      { className: "space-y-5", onSubmit },
      h(
        "div",
        { className: "space-y-2" },
        h("label", { htmlFor: "names", className: `block text-sm font-semibold ${theme === "dark" ? "text-stone-200" : "text-stone-700"}` }, "Names"),
        h("textarea", {
          id: "names",
          className: `min-h-72 w-full rounded-[1.5rem] border px-4 py-4 font-medium outline-none transition focus:border-amber-600 ${
            theme === "dark"
              ? "border-stone-700 bg-stone-950 text-stone-100"
              : "border-stone-300 bg-stone-50 text-stone-900"
          }`,
          placeholder: "Ada Lovelace\nGrace Hopper\nMargaret Hamilton\nLinus Torvalds",
          value: rawNames,
          onChange: (event) => onChange(event.target.value),
        }),
      ),
      h(
        "fieldset",
        { className: "space-y-3" },
        h("legend", { className: `text-sm font-semibold ${theme === "dark" ? "text-stone-200" : "text-stone-700"}` }, "Mode"),
        h(
          "div",
          { className: "grid gap-3 sm:grid-cols-2" },
          ...[
            {
              value: "seeded",
              title: "Original order",
              description: "Build the opening round from the names exactly as entered.",
            },
            {
              value: "randomize",
              title: "Randomize",
              description: "Shuffle the names once, then build the bracket from that order.",
            },
          ].map((modeOption) =>
            h(
              "label",
              {
                key: modeOption.value,
                className: `cursor-pointer rounded-[1.5rem] border p-4 transition ${
                  buildMode === modeOption.value
                    ? theme === "dark"
                      ? "border-amber-500 bg-amber-950/40"
                      : "border-amber-600 bg-amber-100"
                    : theme === "dark"
                      ? "border-stone-700 bg-stone-950"
                      : "border-stone-300 bg-stone-50"
                }`,
              },
              h("input", {
                type: "radio",
                name: "build-mode",
                value: modeOption.value,
                checked: buildMode === modeOption.value,
                className: "sr-only",
                onChange: (event) => onBuildModeChange(event.target.value),
              }),
              h("p", { className: `text-sm font-semibold ${theme === "dark" ? "text-stone-100" : "text-stone-900"}` }, modeOption.title),
              h("p", { className: `mt-1 text-sm leading-6 ${theme === "dark" ? "text-stone-400" : "text-stone-600"}` }, modeOption.description),
            ),
          ),
        ),
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

function BracketView({ onExport, state, theme, onSelectWinner }) {
  const layout = buildBracketLayout(state.rounds, BRACKET_LAYOUT);

  return h(
    "section",
    { className: "space-y-6" },
    state.champion
      ? h(
          "div",
          { className: "rounded-[2rem] bg-stone-900 px-6 py-5 text-amber-50 shadow-[0_24px_80px_-32px_rgba(28,25,23,0.75)]" },
          h(
            "div",
            { className: "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between" },
            h(
              "div",
              null,
              h("p", { className: "text-sm font-semibold uppercase tracking-[0.3em] text-amber-300" }, "Chosen Name"),
              h("p", { className: "mt-2 text-3xl font-black tracking-tight sm:text-4xl" }, state.champion),
            ),
            h(
              "button",
              {
                type: "button",
                className:
                  "inline-flex items-center justify-center rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-amber-300",
                onClick: onExport,
              },
              "Save results",
            ),
          ),
        )
      : h(
          "div",
          {
            className: `rounded-[2rem] border px-6 py-5 ${
              theme === "dark" ? "border-amber-700 bg-amber-950/40" : "border-amber-300 bg-amber-100"
            }`,
          },
          h("p", { className: "text-sm font-semibold uppercase tracking-[0.3em] text-amber-800" }, "In Progress"),
          h("p", { className: `mt-2 text-lg font-semibold ${theme === "dark" ? "text-amber-200" : "text-amber-950"}` }, "Click a name in any matchup to advance it."),
        ),
    h(
      "div",
      { className: "overflow-x-auto pb-4" },
      h(
        "div",
        {
          className: `relative min-w-max rounded-[2rem] border p-6 shadow-[0_24px_80px_-40px_rgba(41,37,36,0.45)] ${
            theme === "dark"
              ? "border-stone-800 bg-[linear-gradient(180deg,rgba(28,25,23,0.98),rgba(12,10,9,0.95))]"
              : "border-stone-300 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(250,245,235,0.9))]"
          }`,
          style: { width: `${layout.width + 48}px` },
        },
        ...state.rounds.map((round, roundIndex) =>
          h(
            "div",
            {
              key: `label-${roundIndex}`,
              className: "absolute",
              style: {
                left: `${24 + roundIndex * (layout.columnWidth + layout.columnGap)}px`,
                top: "0px",
                width: `${layout.columnWidth}px`,
              },
            },
            h("p", { className: `text-xs font-semibold uppercase tracking-[0.3em] ${theme === "dark" ? "text-stone-500" : "text-stone-500"}` }, roundLabel(state.rounds.length, roundIndex)),
            h("p", { className: `mt-1 text-sm ${theme === "dark" ? "text-stone-400" : "text-stone-600"}` }, `${round.length} matchup${round.length === 1 ? "" : "s"}`),
          ),
        ),
        h(
          "div",
          {
            className: "relative mt-14",
            style: { height: `${layout.height}px`, width: `${layout.width}px` },
          },
          ...state.rounds.flatMap((round, roundIndex) =>
            round.flatMap((matchup, matchupIndex) => {
              const connector = buildConnector(layout, roundIndex, matchupIndex);

              return [
                connector ? h(ConnectorSet, { connector, key: `connector-${roundIndex}-${matchupIndex}`, theme }) : null,
                h(MatchupCard, {
                  key: `matchup-${roundIndex}-${matchupIndex}`,
                  matchup,
                  onSelect: (winnerName) => onSelectWinner(roundIndex, matchupIndex, winnerName),
                  theme,
                  style: {
                    height: `${layout.cardHeight}px`,
                    left: `${roundIndex * (layout.columnWidth + layout.columnGap)}px`,
                    top: `${layout.rounds[roundIndex][matchupIndex].top}px`,
                    width: `${layout.columnWidth}px`,
                  },
                }),
              ];
            }),
          ),
        ),
      ),
    ),
  );
}

function ConnectorSet({ connector, theme }) {
  return h(
    React.Fragment,
    null,
    h("div", {
      className: `absolute h-px ${theme === "dark" ? "bg-stone-700" : "bg-stone-300"}`,
      style: {
        left: `${connector.horizontalStart.left}px`,
        top: `${connector.horizontalStart.top}px`,
        width: `${connector.horizontalStart.width}px`,
      },
    }),
    h("div", {
      className: `absolute w-px ${theme === "dark" ? "bg-stone-700" : "bg-stone-300"}`,
      style: {
        left: `${connector.vertical.left}px`,
        top: `${connector.vertical.top}px`,
        height: `${connector.vertical.height}px`,
      },
    }),
    h("div", {
      className: `absolute h-px ${theme === "dark" ? "bg-stone-700" : "bg-stone-300"}`,
      style: {
        left: `${connector.horizontalEnd.left}px`,
        top: `${connector.horizontalEnd.top}px`,
        width: `${connector.horizontalEnd.width}px`,
      },
    }),
  );
}

function MatchupCard({ matchup, onSelect, style, theme }) {
  return h(
    "article",
    {
      className: `absolute flex flex-col justify-between rounded-[1.4rem] border p-3 shadow-[0_12px_30px_-24px_rgba(41,37,36,0.5)] ${
        theme === "dark" ? "border-stone-700 bg-stone-900/95" : "border-stone-300 bg-white/95"
      }`,
      style,
    },
    ...matchup.slots.map((name, slotIndex) =>
      h(
        "button",
        {
          key: `${name ?? "empty"}-${slotIndex}`,
          type: "button",
          disabled: !name,
          className: buttonClassName(matchup.winner === name, !name, theme),
          onClick: () => name && onSelect(name),
        },
        name ?? "Waiting for winner",
      ),
    ),
  );
}

function buttonClassName(isWinner, isEmpty, theme = "light") {
  const classes = [
    "flex-1 rounded-[1rem] px-4 py-3 text-left text-sm font-semibold transition",
  ];

  if (isEmpty) {
    classes.push(
      theme === "dark"
        ? "cursor-not-allowed border border-dashed border-stone-700 bg-stone-950 text-stone-600"
        : "cursor-not-allowed border border-dashed border-stone-300 bg-white text-stone-400",
    );
    return classes.join(" ");
  }

  if (isWinner) {
    classes.push("bg-amber-500 text-stone-950 shadow-[inset_0_0_0_1px_rgba(120,53,15,0.2)]");
    return classes.join(" ");
  }

  classes.push(
    theme === "dark"
      ? "bg-stone-800 text-stone-100 shadow-[inset_0_0_0_1px_rgba(68,64,60,1)] hover:bg-amber-400 hover:text-stone-950"
      : "bg-white text-stone-800 shadow-[inset_0_0_0_1px_rgba(214,211,209,1)] hover:bg-stone-900 hover:text-amber-50",
  );
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

function loadTheme() {
  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme === "dark" || savedTheme === "light") {
    return savedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

createRoot(document.getElementById("app")).render(h(App));
