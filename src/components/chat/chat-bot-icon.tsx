/**
 * Custom icon (not a stock lucide glyph) for the chat launcher button — a
 * chat bubble with a `</>` code-chevron pair inside it, so the icon reads as
 * "a developer's chatbot" rather than a generic chat-app bubble. Built from
 * the same stroke weight/line style as the lucide icons used everywhere
 * else on the site (2px stroke, round caps/joins) so it fits in visually
 * despite not being from that set.
 */
export function ChatBotIcon({
  className,
  size = 22,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <polyline points="10 8 7.5 10.5 10 13" />
      <polyline points="13 8 15.5 10.5 13 13" />
    </svg>
  );
}
