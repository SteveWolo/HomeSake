import { useQuery } from "@tanstack/react-query";

import { taskCompleted, visitPhotoLinks, type VisitReport } from "@/lib/visit-workspace";

export function VisitReportContent({ report, reviewing = false }: { report: VisitReport; reviewing?: boolean }) {
  const taskPaths = report.checks.flatMap((task) => task.photos ?? []);
  const paths = [...new Set([...report.photos, ...taskPaths])];
  const generalPaths = report.photos.filter((path) => !taskPaths.includes(path));
  const photos = useQuery({
    queryKey: ["visit-report-photos", paths],
    queryFn: () => visitPhotoLinks(paths),
    enabled: paths.length > 0,
    staleTime: 20 * 60 * 1000,
  });
  const gallery = (items: string[], label: string) => (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((path, index) => {
        const url = photos.data?.find((photo) => photo.path === path)?.signedUrl;
        return url && <a key={path} href={url} target="_blank" rel="noreferrer">
          <img src={url} alt={`${label} photo ${index + 1}`} loading="lazy"
            className="aspect-square w-full rounded-sm object-cover" />
        </a>;
      })}
    </div>
  );
  const sections = [
    { label: "Needs immediate attention", tasks: report.checks.filter((task) => task.status === "Needs attention" && task.urgent), open: true },
    { label: "Needs follow-up", tasks: report.checks.filter((task) => task.status === "Needs attention" && !task.urgent), open: true },
    { label: "Completed for you", tasks: report.checks.filter((task) => task.status === "Completed" && taskCompleted(task)), open: false },
    { label: "Other findings", tasks: report.checks.filter((task) => task.status === "Completed" && !taskCompleted(task)), open: false },
    { label: "Not applicable", tasks: report.checks.filter((task) => task.status === "Not applicable"), open: false },
  ];
  return (
    <div className="space-y-4">
      {sections.map(({ label, tasks: checks, open }) => {
        if (!checks.length) return null;
        return (
          <details key={label} open={open || reviewing}>
            <summary className="cursor-pointer font-semibold">{label} ({checks.length})</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {checks.map((check, i) => <li key={i} className="mb-2">
                <p>{check.title}{check.fixed ? " · Fixed during visit" : check.condition ? ` · ${check.condition}` : ""}{check.status === "Needs attention" && taskCompleted(check) ? " · Check completed" : ""}</p>
                {check.note?.trim() && <p className="whitespace-pre-wrap break-words text-muted-foreground">{check.note}</p>}
                {check.photos?.length ? gallery(check.photos, check.title) : null}
              </li>)}
            </ul>
          </details>
        );
      })}
      {report.summary && <p className="whitespace-pre-wrap break-words text-sm">{report.summary}</p>}
      {report.checks.length > 0 && <p className="font-semibold text-primary">{report.checks.filter(taskCompleted).length} tasks completed on this visit</p>}
      {photos.isError && <p role="alert" className="text-sm">Report photos could not be loaded.</p>}
      {generalPaths.length > 0 && gallery(generalPaths, "Visit report")}
    </div>
  );
}
