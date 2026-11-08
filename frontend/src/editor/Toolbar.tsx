import { useEffect, useState } from "react";
import type { Dispatch } from "react";

import type { RuleResult, Wall } from "../types/api";
import type { BackgroundState } from "./RoomCanvas";
import type { EditorAction, EditorState } from "./useEditor";
import { totalPkr } from "./useEditor";
import { RoomDetails } from "./RoomDetails";

interface ToolbarProps {
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
  bg: BackgroundState | null;
  onUploadImage: (file: File) => void;
  onClearImage: () => void;
  onBgOpacity: (v: number) => void;
  onBgScale: (v: number) => void;
  onValidate: () => void;
  validating: boolean;
  apiError: string | null;
  onSave: () => void;
  saving: boolean;
  accountLoading: boolean;
  onNewLayout: () => void;
  onHelp: () => void;
  note: string | null;
}

// A titled card, used for every group of controls in the rail.
function Section({
  title,
  children,
  accent = false,
}: {
  title: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <section className="rounded-xl border border-sand bg-cream-100 p-3 shadow-sm">
      <h3
        className={
          "mb-2 text-xs font-semibold uppercase tracking-[0.2em] " +
          (accent ? "text-terracotta" : "text-ink/50")
        }
      >
        {title}
      </h3>
      {children}
    </section>
  );
}

// A collapsible card for the secondary "room setup" controls, so the inspector
// and the fit status lead the rail.
function Collapsible({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="rounded-xl border border-sand bg-cream-100 p-3 shadow-sm"
    >
      <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.2em] text-ink/50 [&::-webkit-details-marker]:hidden">
        {title}
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

// A number field that only commits a valid, positive value on blur / Enter, so
// half-typed values (or an empty box) never blow up the canvas scale.
function NumInput({
  label,
  value,
  min = 0,
  onCommit,
}: {
  label: string;
  value: number;
  min?: number;
  onCommit: (v: number) => void;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const commit = () => {
    const v = Number(text);
    if (Number.isFinite(v) && v >= min) onCommit(v);
    else setText(String(value));
  };
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-ink/60">
      {label}
      <input
        type="number"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="w-full min-w-0 rounded-lg border border-sand bg-white px-2 py-1 text-sm text-ink focus:border-terracotta focus:outline-none"
      />
    </label>
  );
}

const FIELD =
  "rounded-lg border border-sand bg-white px-2 py-1 text-sm text-ink focus:border-terracotta focus:outline-none";
const BTN_PRIMARY =
  "rounded-lg bg-terracotta px-3 py-2 text-sm font-medium text-cream shadow-sm transition-colors hover:bg-terracotta-600 disabled:opacity-50";
const BTN_GHOST =
  "rounded-lg border border-sand bg-white px-2 py-1 text-sm text-ink/80 transition-colors hover:border-terracotta/50";
const BTN_DANGER =
  "rounded-lg border border-terracotta/40 bg-white px-2 py-1 text-sm text-terracotta-600 transition-colors hover:bg-terracotta/10";

const WALLS: { value: Wall; label: string }[] = [
  { value: "north", label: "North (top)" },
  { value: "south", label: "South (bottom)" },
  { value: "west", label: "West (left)" },
  { value: "east", label: "East (right)" },
];

// Friendly labels for the engine's five spatial rules.
const RULE_LABEL: Record<string, string> = {
  in_bounds: "Inside room",
  no_overlap: "No overlaps",
  clearance: "Clearance",
  door_clearance: "Door swing",
  orientation: "Against wall",
};
const RULE_ORDER = ["in_bounds", "no_overlap", "clearance", "door_clearance", "orientation"];

export function Toolbar({
  state,
  dispatch,
  bg,
  onUploadImage,
  onClearImage,
  onBgOpacity,
  onBgScale,
  onValidate,
  validating,
  apiError,
  onSave,
  saving,
  accountLoading,
  onNewLayout,
  onHelp,
  note,
}: ToolbarProps) {
  const selected = state.placements.find((p) => p.instanceId === state.selectedId);
  const total = totalPkr(state.placements);

  // Local state for the "add door" form.
  const [wall, setWall] = useState<Wall>("north");
  const [doorOffset, setDoorOffset] = useState("100");
  const [doorWidth, setDoorWidth] = useState("80");
  const [hingeLeft, setHingeLeft] = useState(true);
  const [swingsInward, setSwingsInward] = useState(true);

  const addDoor = () => {
    const offset_cm = Number(doorOffset);
    const width_cm = Number(doorWidth);
    if (!Number.isFinite(offset_cm) || !Number.isFinite(width_cm) || width_cm <= 0) return;
    dispatch({
      type: "addDoor",
      door: {
        id: crypto.randomUUID(),
        wall,
        offset_cm,
        width_cm,
        swings_inward: swingsInward,
        hinge_left: hingeLeft,
      },
    });
  };

  const byRule = new Map<string, RuleResult>();
  state.fitReport?.rules.forEach((r) => byRule.set(r.rule, r));
  const overBudget = state.budgetPkr != null && total > state.budgetPkr;
  const failing = state.fitReport ? state.fitReport.rules.filter((r) => !r.passed).length : 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Session actions — moved off the top bar to sit with the inspector. */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <button type="button" disabled={saving || accountLoading} onClick={onSave} className={BTN_GHOST + " flex-1 disabled:opacity-50"}>
            {saving ? "Saving…" : "Save"}
          </button>
          <button type="button" disabled={saving} onClick={onNewLayout} className={BTN_GHOST + " flex-1 disabled:opacity-50"}>
            New layout
          </button>
          <button type="button" onClick={onHelp} className={BTN_GHOST + " flex-1"}>
            Help
          </button>
        </div>
        {note && (
          <p className="rounded-lg border border-sand bg-cream-100 px-2.5 py-1.5 text-xs text-ink/60">
            {note}
          </p>
        )}
      </div>

      <Section title="Selected item" accent>
        {selected ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-cream">
                {selected.product.image && (
                  <img
                    src={selected.product.image}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                )}
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-ink">
                  {selected.product.name}
                </div>
                <div className="text-xs text-ink/50">
                  {selected.product.seller.name}
                </div>
              </div>
            </div>

            <div className="text-xs text-ink/60">
              Dimensions: {selected.footprint.width_cm}W × {selected.footprint.depth_cm}D cm
            </div>

            <div className="flex gap-2">
              <NumInput
                label="Rotation (°)"
                value={selected.footprint.rotation_deg}
                min={0}
                onCommit={(v) =>
                  dispatch({
                    type: "setRotation",
                    instanceId: selected.instanceId,
                    rotation_deg: v,
                  })
                }
              />
              <NumInput
                label="X (cm)"
                value={Math.round(selected.footprint.center.x)}
                min={0}
                onCommit={(v) =>
                  dispatch({
                    type: "movePlacement",
                    instanceId: selected.instanceId,
                    x: v,
                    y: selected.footprint.center.y,
                  })
                }
              />
              <NumInput
                label="Y (cm)"
                value={Math.round(selected.footprint.center.y)}
                min={0}
                onCommit={(v) =>
                  dispatch({
                    type: "movePlacement",
                    instanceId: selected.instanceId,
                    x: selected.footprint.center.x,
                    y: v,
                  })
                }
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  dispatch({ type: "rotatePlacement", instanceId: selected.instanceId })
                }
                className={BTN_GHOST + " flex-1"}
              >
                Rotate 90°
              </button>
              <button
                type="button"
                onClick={() =>
                  dispatch({ type: "deletePlacement", instanceId: selected.instanceId })
                }
                className={BTN_DANGER + " flex-1"}
              >
                Delete item
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-ink/40">
            Click an item on the plan to inspect, rotate or delete it.
          </p>
        )}
      </Section>

      <Section title="Fit status" accent>
        <button
          type="button"
          onClick={onValidate}
          disabled={validating}
          className={BTN_PRIMARY + " w-full"}
        >
          {validating ? "Checking…" : "Validate layout"}
        </button>

        {apiError && (
          <p className="mt-2 rounded-lg border border-terracotta/30 bg-terracotta/10 p-2 text-xs text-terracotta-600">
            {apiError}
          </p>
        )}

        {state.fitReport && (
          <div className="mt-3 flex flex-col gap-2">
            <div
              className={
                "rounded-lg px-2.5 py-1.5 text-sm font-medium " +
                (state.fitReport.valid
                  ? "bg-forest-600/15 text-forest-700"
                  : "bg-terracotta/15 text-terracotta-600")
              }
            >
              {state.fitReport.valid
                ? "✓ All checks passed"
                : `✗ ${failing} check${failing === 1 ? "" : "s"} failing`}
            </div>

            <ul className="flex flex-col gap-1">
              {RULE_ORDER.map((rule) => {
                const r = byRule.get(rule);
                const passed = r ? r.passed : null;
                return (
                  <li key={rule} className="flex flex-col">
                    <span className="flex items-center gap-1.5 text-xs">
                      <span
                        className={
                          passed === null
                            ? "text-ink/30"
                            : passed
                              ? "text-forest-700"
                              : "text-terracotta-600"
                        }
                      >
                        {passed === null ? "•" : passed ? "✓" : "✗"}
                      </span>
                      <span className="text-ink/80">{RULE_LABEL[rule]}</span>
                    </span>
                    {r && !r.passed && r.detail && (
                      <span className="pl-4 text-[11px] text-ink/50">{r.detail}</span>
                    )}
                  </li>
                );
              })}
              <li className="mt-1 flex items-center gap-1.5 border-t border-sand pt-1.5 text-xs">
                <span
                  className={
                    state.budgetPkr == null
                      ? "text-ink/30"
                      : overBudget
                        ? "text-terracotta-600"
                        : "text-forest-700"
                  }
                >
                  {state.budgetPkr == null ? "•" : overBudget ? "✗" : "✓"}
                </span>
                <span className="text-ink/80">
                  Budget — Rs {total.toLocaleString("en-PK")}
                  {state.budgetPkr != null && ` / ${state.budgetPkr.toLocaleString("en-PK")}`}
                </span>
              </li>
            </ul>

            {state.budgetPkr != null && (
              <div className={overBudget ? "text-xs text-terracotta-600" : "text-xs text-forest-700"}>
                {overBudget
                  ? `Over budget by Rs ${(total - state.budgetPkr).toLocaleString("en-PK")}`
                  : `Within budget (Rs ${(state.budgetPkr - total).toLocaleString("en-PK")} to spare)`}
              </div>
            )}
          </div>
        )}
      </Section>

      <Section title="Budget">
        <label className="flex flex-col gap-1 text-xs text-ink/60">
          Budget (Rs, optional)
          <input
            type="number"
            value={state.budgetPkr ?? ""}
            onChange={(e) =>
              dispatch({
                type: "setBudget",
                budgetPkr: e.target.value === "" ? null : Number(e.target.value),
              })
            }
            className={FIELD + " w-full min-w-0"}
          />
        </label>
      </Section>

      <Collapsible title="Room setup">
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <NumInput
              label="Width (cm)"
              value={state.room.width_cm}
              min={100}
              onCommit={(v) =>
                dispatch({ type: "setRoomSize", width_cm: v, length_cm: state.room.length_cm })
              }
            />
            <NumInput
              label="Length (cm)"
              value={state.room.length_cm}
              min={100}
              onCommit={(v) =>
                dispatch({ type: "setRoomSize", width_cm: state.room.width_cm, length_cm: v })
              }
            />
          </div>

          <div className="flex flex-col gap-2 rounded-lg border border-sand bg-white/60 p-2">
            <span className="text-xs font-medium text-ink/70">Trace a floor plan (optional)</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUploadImage(f);
                e.target.value = "";
              }}
              className="w-full text-xs text-ink/60 file:mr-2 file:rounded-md file:border-0 file:bg-sand file:px-2 file:py-1 file:text-xs file:text-ink"
            />
            {bg && (
              <div className="flex flex-col gap-2 text-xs text-ink/60">
                <label className="flex flex-col gap-1">
                  Size ({bg.scale.toFixed(2)}×) — line it up with the room
                  <input
                    type="range"
                    min={0.1}
                    max={3}
                    step={0.05}
                    value={bg.scale}
                    onChange={(e) => onBgScale(Number(e.target.value))}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  Opacity
                  <input
                    type="range"
                    min={0.1}
                    max={1}
                    step={0.05}
                    value={bg.opacity}
                    onChange={(e) => onBgOpacity(Number(e.target.value))}
                  />
                </label>
                <button type="button" onClick={onClearImage} className={BTN_GHOST + " self-start"}>
                  Remove image
                </button>
                <p className="text-[11px] text-ink/40">
                  Drag the image on the canvas to position it. Room dimensions above stay the
                  source of truth for validation.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 text-xs text-ink/60">
            <span className="text-xs font-medium text-ink/70">Doors</span>
            <label className="flex flex-col gap-1">
              Wall
              <select
                value={wall}
                onChange={(e) => setWall(e.target.value as Wall)}
                className={FIELD}
              >
                {WALLS.map((w) => (
                  <option key={w.value} value={w.value}>
                    {w.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex gap-2">
              <label className="flex min-w-0 flex-1 flex-col gap-1">
                Offset
                <input
                  type="number"
                  value={doorOffset}
                  onChange={(e) => setDoorOffset(e.target.value)}
                  className={FIELD + " w-full min-w-0"}
                />
              </label>
              <label className="flex min-w-0 flex-1 flex-col gap-1">
                Width
                <input
                  type="number"
                  value={doorWidth}
                  onChange={(e) => setDoorWidth(e.target.value)}
                  className={FIELD + " w-full min-w-0"}
                />
              </label>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={hingeLeft}
                onChange={(e) => setHingeLeft(e.target.checked)}
              />
              Hinge on left / near end
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={swingsInward}
                onChange={(e) => setSwingsInward(e.target.checked)}
              />
              Swings inward
            </label>
            <button type="button" onClick={addDoor} className={BTN_PRIMARY + " self-start"}>
              Add door
            </button>

            {state.room.doors.length > 0 && (
              <ul className="mt-1 flex flex-col gap-1">
                {state.room.doors.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between rounded-md bg-white px-2 py-1"
                  >
                    <span className="text-ink/70">
                      {d.wall}, offset {d.offset_cm}, width {d.width_cm}
                    </span>
                    <button
                      type="button"
                      onClick={() => dispatch({ type: "removeDoor", id: d.id })}
                      className="text-terracotta-600 hover:underline"
                    >
                      remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Collapsible>
      <RoomDetails state={state} dispatch={dispatch} />
    </div>
  );
}
