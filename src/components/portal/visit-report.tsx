import { useQuery } from "@tanstack/react-query";

import { checkStates, visitPhotoLinks, type VisitReport } from "@/lib/visit-workspace";

export function VisitReportContent({ report }: { report: VisitReport }) {
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
  return (
    <div className="space-y-4">
      {report.summary && <p className="whitespace-pre-wrap break-words text-sm">{report.summary}</p>}
      {report.checks.length > 0 && <p className="font-semibold text-primary">{report.checks.filter((task) => task.status === "Completed").length} tasks completed on this visit</p>}
      {checkStates.map((status) => {
        const checks = report.checks.filter((item) => item.status === status);
        if (!checks.length) return null;
        return (
          <details key={status} open={status === "Needs attention"}>
            <summary className="cursor-pointer font-semibold">{status} ({checks.length})</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {checks.map((check, i) => <li key={i} className="mb-2">
                <p>{check.title}</p>
                {check.note?.trim() && <p className="whitespace-pre-wrap break-words text-muted-foreground">{check.note}</p>}
                {check.photos?.length ? gallery(check.photos, check.title) : null}
              </li>)}
            </ul>
          </details>
        );
      })}
      {photos.isError && <p role="alert" className="text-sm">Report photos could not be loaded.</p>}
      {generalPaths.length > 0 && gallery(generalPaths, "Visit report")}
    </div>
  );
}
