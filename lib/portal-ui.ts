/**
 * Shared sidebar styling for the client and admin portals.
 * One source of truth so both portals stay visually identical.
 */

export const sidebarShell =
  "border-b border-border/60 bg-surface/40 backdrop-blur-xl supports-[backdrop-filter]:bg-surface/30 lg:min-h-screen lg:w-72 lg:shrink-0 lg:border-r lg:border-b-0";

export const sidebarHeading =
  "px-6 pt-6 pb-2 text-[10px] font-semibold tracking-[0.22em] text-muted-foreground/70 uppercase";

/** Nav row: glassy active state, soft hover, clear hierarchy. */
export function sidebarItem(active: boolean) {
  return [
    "group relative shrink-0 rounded-lg px-4 py-3 text-left text-sm transition-all duration-200",
    active
      ? "border border-primary/30 bg-primary/12 text-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-sm"
      : "border border-transparent text-muted-foreground hover:border-border/60 hover:bg-foreground/[0.04] hover:text-foreground",
  ].join(" ");
}
