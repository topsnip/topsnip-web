"use client";

// ── Types ────────────────────────────────────────────────────────────────────

interface XpEvent {
  event_type: string;
  xp_amount: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface ActivityTimelineProps {
  events: XpEvent[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const EVENT_LABELS: Record<string, string> = {
  topic_read: "Read",
  search_completed: "Searched",
  checklist_complete: "Completed checklist",
  daily_three: "Daily 3 bonus",
  streak_7: "7-day streak milestone",
  streak_30: "30-day streak milestone",
  first_search: "First search",
  first_topic: "First topic read",
};

function getEventDescription(event: XpEvent): string {
  const base = EVENT_LABELS[event.event_type] ?? event.event_type;
  const title = event.metadata?.topic_title || event.metadata?.query;
  if (title) {
    return `${base} "${title}"`;
  }
  return base;
}

function getEventIcon(eventType: string): string {
  switch (eventType) {
    case "topic_read":
    case "first_topic":
      return "📖";
    case "search_completed":
    case "first_search":
      return "🔍";
    case "checklist_complete":
      return "✅";
    case "daily_three":
      return "🏆";
    case "streak_7":
    case "streak_30":
      return "🔥";
    default:
      return "⚡";
  }
}

function formatRelativeDay(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const eventDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((today.getTime() - eventDay.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function groupByDay(events: XpEvent[]): Map<string, XpEvent[]> {
  const groups = new Map<string, XpEvent[]>();
  for (const event of events) {
    const day = formatRelativeDay(event.created_at);
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day)!.push(event);
  }
  return groups;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function ActivityTimeline({ events }: ActivityTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <div
        className="rounded-xl p-6 text-center"
        style={{
          background: "var(--ts-surface)",
          border: "1px solid var(--border)",
        }}
      >
        <p className="text-sm" style={{ color: "var(--ts-text-2)" }}>
          No activity yet. Start reading to earn XP!
        </p>
      </div>
    );
  }

  const grouped = groupByDay(events);
  const dayEntries = Array.from(grouped.entries());

  return (
    <div className="relative pl-4">
      {/* Timeline line */}
      <div
        className="absolute left-[7px] top-2 bottom-2"
        style={{
          width: "2px",
          background: "var(--border)",
        }}
      />

      <div className="flex flex-col gap-5">
        {dayEntries.map(([day, dayEvents], dayIdx) => (
          <div key={day} className="relative">
            {/* Day dot */}
            <div
              className="absolute -left-4 top-[3px]"
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: dayIdx === 0 ? "var(--ts-accent, #E8734A)" : "var(--ts-muted)",
              }}
            />

            {/* Day label */}
            <span
              className="text-xs font-semibold block mb-2"
              style={{
                color: dayIdx === 0 ? "var(--text-primary, #EDEDEF)" : "var(--ts-muted)",
              }}
            >
              {day}
            </span>

            {/* Events for this day */}
            <div className="flex flex-col gap-1.5 ml-2">
              {dayEvents.map((event, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span
                    className="text-xs"
                    style={{ color: "var(--ts-muted)", minWidth: "20px" }}
                  >
                    └─
                  </span>
                  <span style={{ fontSize: "14px" }} aria-hidden="true">
                    {getEventIcon(event.event_type)}
                  </span>
                  <span style={{ color: "var(--ts-text-2, #8A8A8E)" }}>
                    {getEventDescription(event)}
                  </span>
                  <span
                    className="text-xs font-semibold ml-auto flex-shrink-0"
                    style={{ color: "var(--ts-accent, #E8734A)" }}
                  >
                    +{event.xp_amount} XP
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
