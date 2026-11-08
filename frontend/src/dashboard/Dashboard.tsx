import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AccountLinks } from "../auth/AccountLinks";
import { useAuth } from "../auth/authState";
import { api } from "../lib/api";
import type { LayoutSummary } from "../types/api";

const BUTTON = "rounded-lg border border-sand px-3 py-2 text-sm hover:border-terracotta disabled:opacity-50";

export function Dashboard() {
  const { user } = useAuth();
  const [layouts, setLayouts] = useState<LayoutSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  async function load(more = false) {
    setLoading(true); setError(null);
    try {
      const rows = await api.layouts(more ? layouts.length : 0);
      setLayouts(previous => more ? [...previous, ...rows] : rows);
      setHasMore(rows.length === 100);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load your layouts."); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    let cancelled = false;
    api.layouts().then(rows => { if (!cancelled) { setLayouts(rows); setHasMore(rows.length === 100); } })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : "Unable to load your layouts."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function rename(id: string) {
    setBusy(id); setError(null);
    try {
      const saved = await api.renameLayout(id, name);
      setLayouts(previous => previous.map(layout => layout.layout_id === id ? { ...layout, name: saved.name, updated_at: saved.updated_at } : layout));
      setEditing(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to rename layout."); }
    finally { setBusy(null); }
  }
  async function remove(id: string) {
    setBusy(id); setError(null);
    try { await api.deleteLayout(id); setLayouts(previous => previous.filter(layout => layout.layout_id !== id)); setDeleting(null); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to delete layout."); }
    finally { setBusy(null); }
  }

  return <div className="min-h-screen bg-cream text-ink">
    <header className="bg-forest-800 text-cream"><nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
      <Link to="/" className="flex items-center gap-3 font-serif text-xl"><img src="/logo.png" alt="" className="h-9 rounded-lg bg-cream p-1" />RooMatch</Link><AccountLinks />
    </nav></header>
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
        <div><p className="mb-2 text-sm text-terracotta">{user?.email}</p><h1 className="font-serif text-4xl">My room layouts</h1><p className="mt-3 text-ink/60">Pick up where you left off, or plan a new room.</p></div>
        <Link to="/studio" className="rounded-lg bg-terracotta px-5 py-3 font-medium text-cream hover:bg-terracotta-600">+ New layout</Link>
      </div>
      {error && <div role="alert" className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-terracotta/30 bg-terracotta/10 p-4"><p>{error}</p><button className={BUTTON} onClick={() => void load()}>Reload layouts</button></div>}
      {loading && <p role="status" className="mb-6 text-ink/60">Loading layouts…</p>}
      {!loading && !error && layouts.length === 0 && <section className="rounded-2xl border border-dashed border-sand bg-cream-100 px-6 py-16 text-center">
        <h2 className="font-serif text-2xl">A little space for your ideas</h2><p className="mt-3 text-ink/60">Create a room, arrange furniture, and save it here.</p><Link to="/studio" className="mt-6 inline-block rounded-lg bg-forest-800 px-5 py-3 text-cream">Plan my first room</Link>
      </section>}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {layouts.map(layout => <article key={layout.layout_id} className="overflow-hidden rounded-2xl border border-sand bg-cream-100 shadow-sm">
          <Link to={`/studio/${layout.layout_id}`} aria-label={`Open ${layout.name}`} className="flex h-40 items-center justify-center bg-sand/45 p-6">
            <div className="flex max-h-full max-w-full items-center justify-center border-[3px] border-forest-700 bg-cream px-4 text-sm text-forest-700" style={{ aspectRatio: layout.room_width_cm / layout.room_length_cm, width: "80%", height: "auto", maxHeight: "110px" }}>{layout.room_width_cm} × {layout.room_length_cm} cm</div>
          </Link>
          <div className="p-5">
            {editing === layout.layout_id ? <form onSubmit={e => { e.preventDefault(); void rename(layout.layout_id); }} className="flex flex-col gap-2">
              <label className="text-sm">Layout name<input required maxLength={120} autoFocus className="mt-1 w-full rounded-lg border border-sand bg-white px-3 py-2" value={name} onChange={e => setName(e.target.value)} /></label>
              <div className="flex gap-2"><button disabled={busy !== null} className={BUTTON}>Save name</button><button type="button" disabled={busy !== null} className={BUTTON} onClick={() => setEditing(null)}>Cancel</button></div>
            </form> : <h2 className="break-words font-serif text-xl"><Link to={`/studio/${layout.layout_id}`}>{layout.name}</Link></h2>}
            <p className="mt-3 text-sm text-ink/60">{layout.item_count} {layout.item_count === 1 ? "item" : "items"}{layout.budget_pkr !== null && ` · PKR ${layout.budget_pkr.toLocaleString()} budget`}</p>
            <p className="mt-1 text-xs text-ink/50">Updated {new Date(layout.updated_at).toLocaleString()}</p>
            {deleting === layout.layout_id ? <div className="mt-4 rounded-lg bg-terracotta/10 p-3"><p className="mb-3 text-sm">Delete this saved layout?</p><div className="flex gap-2"><button disabled={busy !== null} className={BUTTON + " text-terracotta-600"} onClick={() => void remove(layout.layout_id)}>{busy === layout.layout_id ? "Deleting…" : "Delete layout"}</button><button disabled={busy !== null} className={BUTTON} onClick={() => setDeleting(null)}>Cancel</button></div></div>
              : <div className="mt-5 flex flex-wrap gap-2"><Link className={BUTTON + " bg-forest-800 text-cream"} to={`/studio/${layout.layout_id}`}>Open</Link><button disabled={busy !== null} className={BUTTON} onClick={() => { setEditing(layout.layout_id); setName(layout.name); setDeleting(null); }}>Rename</button><button disabled={busy !== null} className={BUTTON + " text-terracotta-600"} onClick={() => { setDeleting(layout.layout_id); setEditing(null); }}>Delete</button></div>}
          </div>
        </article>)}
      </div>
      {hasMore && <button disabled={loading} className={BUTTON + " mt-6"} onClick={() => void load(true)}>Load more layouts</button>}
    </main>
  </div>;
}
