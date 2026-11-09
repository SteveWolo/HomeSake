export type ChatMessage = {
  id: string;
  sender: "visitor" | "homesake";
  text: string;
  sentAt: string;
};

const chicagoClock = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Chicago",
  weekday: "short",
  hour: "numeric",
  hourCycle: "h23",
});

export function websiteChatIsOpen(now = new Date()) {
  const parts = chicagoClock.formatToParts(now);
  const day = parts.find((part) => part.type === "weekday")?.value;
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  return day !== "Sat" && day !== "Sun" && hour >= 9 && hour < 17;
}

export function parseWebsiteInboxSearch(search: Record<string, unknown>): { inbox?: 1 } {
  return search["inbox"] === 1 || search["inbox"] === "1" ? { inbox: 1 } : {};
}
