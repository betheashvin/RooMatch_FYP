import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";

export function StudioDialog({ title, onClose, busy = false, children }: {
  title: string;
  onClose: () => void;
  busy?: boolean;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);

  return <dialog ref={dialog} aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
    className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-2xl bg-cream p-6 text-ink shadow-xl backdrop:bg-forest-900/60">
    <h2 id={titleId} className="font-serif text-2xl">{title}</h2>
    {children}
  </dialog>;
}
