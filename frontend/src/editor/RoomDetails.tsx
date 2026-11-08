import { useState } from "react";
import type { Dispatch, FormEvent } from "react";
import type { Wall } from "../types/api";
import type { EditorAction, EditorState } from "./useEditor";
import { customProduct } from "./savedLayouts.ts";

const FIELD = "mt-1 w-full rounded-lg border border-sand bg-white px-2 py-1.5 text-sm text-ink";
const BUTTON = "rounded-lg border border-sand bg-white px-3 py-2 text-xs hover:border-terracotta";

export function RoomDetails({ state, dispatch }: { state: EditorState; dispatch: Dispatch<EditorAction> }) {
  const [fixed, setFixed] = useState(true);
  const [error, setError] = useState<string | null>(null);
  function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null);
    const data = new FormData(event.currentTarget);
    const label = String(data.get("label")).trim();
    const width = Number(data.get("width"));
    const depth = Number(data.get("depth"));
    const height = Number(data.get("height"));
    const x = Number(data.get("x"));
    const y = Number(data.get("y"));
    if (!label || ![width, depth, height, x, y].every(Number.isFinite) || width <= 0 || depth <= 0 || height <= 0) { setError("Enter a name and valid dimensions."); return; }
    const id = crypto.randomUUID();
    const footprint = { center: { x, y }, width_cm: width, depth_cm: depth, rotation_deg: Number(data.get("rotation")) };
    if (fixed) dispatch({ type: "addFixedItem", item: { id, label, footprint, height_cm: height } });
    else dispatch({ type: "addCustom", placement: { instanceId: id, custom: true, product: customProduct(id, label, width, depth, height), footprint } });
  }
  function addWindow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null);
    const data = new FormData(event.currentTarget);
    const wall = String(data.get("wall")) as Wall;
    const offset_cm = Number(data.get("offset"));
    const width_cm = Number(data.get("width"));
    const extent = wall === "north" || wall === "south" ? state.room.width_cm : state.room.length_cm;
    if (offset_cm < 0 || width_cm <= 0 || offset_cm + width_cm > extent) { setError("The window must fit along its wall."); return; }
    dispatch({ type: "addWindow", window: { id: crypto.randomUUID(), wall, offset_cm, width_cm } });
  }
  return <details className="rounded-xl border border-sand bg-cream-100 p-3 text-xs text-ink/70">
    <summary className="cursor-pointer font-semibold uppercase tracking-widest">Windows & owned items</summary>
    <div className="mt-4 flex flex-col gap-5">
      {error && <p role="alert" className="text-terracotta-600">{error}</p>}
      <form onSubmit={addWindow} className="flex flex-col gap-2">
        <h3 className="font-semibold">Add window</h3>
        <label>Wall<select name="wall" className={FIELD}>{(["north", "south", "west", "east"] as const).map(wall => <option key={wall}>{wall}</option>)}</select></label>
        <div className="flex gap-2"><label className="min-w-0 flex-1">Offset (cm)<input name="offset" className={FIELD} type="number" required min={0} step="any" defaultValue={50} /></label><label className="min-w-0 flex-1">Width (cm)<input name="width" className={FIELD} type="number" required min={1} step="any" defaultValue={100} /></label></div>
        <button className={BUTTON}>Add window</button>
      </form>
      {state.room.windows.map(window => <div key={window.id} className="flex items-center justify-between gap-2"><span>{window.wall}: {window.width_cm} cm, offset {window.offset_cm} cm</span><button className="text-terracotta" onClick={() => dispatch({ type: "removeWindow", id: window.id })}>Remove</button></div>)}
      <form onSubmit={addItem} className="flex flex-col gap-2">
        <h3 className="font-semibold">Add owned / custom furniture</h3>
        <label>Name<input name="label" className={FIELD} required maxLength={120} defaultValue="My furniture" /></label>
        <div className="flex gap-2"><label className="min-w-0 flex-1">Width (cm)<input name="width" className={FIELD} type="number" required min={1} max={2000} step="any" defaultValue={80} /></label><label className="min-w-0 flex-1">Depth (cm)<input name="depth" className={FIELD} type="number" required min={1} max={2000} step="any" defaultValue={60} /></label></div>
        <label>Height (cm)<input name="height" className={FIELD} type="number" required min={1} max={2000} step="any" defaultValue={80} /></label>
        <div className="flex gap-2"><label className="min-w-0 flex-1">Center X (cm)<input name="x" className={FIELD} type="number" required step="any" defaultValue={state.room.width_cm / 2} /></label><label className="min-w-0 flex-1">Center Y (cm)<input name="y" className={FIELD} type="number" required step="any" defaultValue={state.room.length_cm / 2} /></label></div>
        <label>Rotation<select name="rotation" className={FIELD}>{[0, 90, 180, 270].map(rotation => <option key={rotation} value={rotation}>{rotation}°</option>)}</select></label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={fixed} onChange={e => setFixed(e.target.checked)} />Keep fixed in this position</label>
        <p className="text-ink/50">Owned items add no purchase cost.</p>
        <button className={BUTTON}>Add item</button>
      </form>
      {state.room.fixed_items.map(item => <div key={item.id} className="flex items-center justify-between gap-2"><span>{item.label} · fixed · {item.footprint.width_cm} × {item.footprint.depth_cm} cm</span><button className="text-terracotta" onClick={() => dispatch({ type: "removeFixedItem", id: item.id })}>Remove</button></div>)}
    </div>
  </details>;
}
