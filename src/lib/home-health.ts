import { readVisitReport, type conditions } from "./visit-workspace";
import type { Appointment } from "./portal";


const checks = [
  { label: "Sump pump", weight: 5, titles: ["Test sump pump when safely appropriate."] },
  { label: "Smoke detectors", weight: 5, titles: ["Test smoke detectors according to Homesake protocol.", "Test smoke detectors as scheduled."] },
  { label: "Exposed plumbing", weight: 5, titles: ["Check accessible exposed plumbing for visible leaks."] },
  { label: "HVAC filter", weight: 3, titles: ["Check HVAC filter condition.", "Check HVAC filter for summer-use conditions."] },
  { label: "Water softener area", weight: 3, titles: ["Check water-softener area for visible leakage."] },
  { label: "Kitchen cabinet hardware", weight: 1, titles: ["Check kitchen cabinet/drawer hardware for looseness."] },
];

export function healthCheck(title: string) {
  return checks.find((check) => check.titles.includes(title));
}

export function homeHealth(visits: Appointment[]) {
  const latest = new Map<string, { condition: typeof conditions[number]; visit: Appointment; note?: string | undefined }>();
  const missed = new Map<string, Appointment>();
  const score = () => {
    let earned = 0;
    let possible = 0;
    for (const { label, weight } of checks) {
      const condition = latest.get(label)?.condition;
      if (!condition || condition === "Not applicable") continue;
      possible += weight;
      earned += condition === "Good" ? weight : condition === "Needs follow-up" ? weight / 2 : 0;
    }
    return possible ? Math.round(100 * earned / possible) : null;
  };
  let previous: number | null = null;
  let changed: string[] = [];
  for (const visit of visits.filter((item) => item.status !== "Cancelled").sort((a, b) =>
    Date.parse(a.scheduled_at) - Date.parse(b.scheduled_at) || a.id.localeCompare(b.id))) {
    const before = score();
    const changes = new Set<string>();
    for (const task of readVisitReport(visit.published_report)?.checks ?? []) {
      const check = healthCheck(task.title);
      if (!check || !task.condition) continue;
      if (task.condition === "Couldn’t check") {
        missed.set(check.label, visit);
        continue;
      }
      missed.delete(check.label);
      if (latest.get(check.label)?.condition !== task.condition) changes.add(`${check.label} · ${task.condition}`);
      latest.set(check.label, { condition: task.condition, visit, note: task.note });
    }
    if (changes.size) {
      previous = before;
      changed = [...changes];
    }
  }
  const results = checks.map(({ label, weight }) => ({ label, weight, result: latest.get(label), missedVisit: missed.get(label) }));
  const applicable = results.filter(({ result }) => result?.condition !== "Not applicable");
  return { score: score(), previous, changed, results, coverage: applicable.filter(({ result }) => result).length, applicable: applicable.length };
}
