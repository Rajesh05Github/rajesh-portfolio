// Up/down reordering rather than drag-and-drop (a real dependency like
// dnd-kit isn't justified yet for a handful of admin list rows) — each
// button is its own tiny form posting to the same server action with a
// direction, so no client JS is required at all.
export function OrderButtons({
  moveAction,
  disableUp,
  disableDown,
}: {
  moveAction: (direction: "up" | "down") => (formData: FormData) => void;
  disableUp?: boolean;
  disableDown?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <form action={moveAction("up")}>
        <button
          type="submit"
          disabled={disableUp}
          aria-label="Move up"
          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
        >
          ▲
        </button>
      </form>
      <form action={moveAction("down")}>
        <button
          type="submit"
          disabled={disableDown}
          aria-label="Move down"
          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
        >
          ▼
        </button>
      </form>
    </div>
  );
}
