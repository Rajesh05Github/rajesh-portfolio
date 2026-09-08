const STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  PUBLISHED: "bg-primary/15 text-primary",
  ARCHIVED: "bg-red-500/10 text-red-400",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${STYLES[status] ?? STYLES.DRAFT}`}
    >
      {status}
    </span>
  );
}
