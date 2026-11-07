import { useQuery } from "@tanstack/react-query";

import { checkStates, visitPhotoLinks, type VisitReport } from "@/lib/visit-workspace";

export function VisitReportContent({ report }: { report: VisitReport }) {
  const photos = useQuery({
    queryKey: ["visit-report-photos", report.photos],
    queryFn: () => visitPhotoLinks(report.photos),
    enabled: report.photos.length > 0,
    staleTime: 20 * 60 * 1000,
  });
  return (
    <div className="space-y-4">
      {report.summary && <p className="whitespace-pre-wrap break-words text-sm">{report.summary}</p>}
      {checkStates.map((status) => {
        const checks = report.checks.filter((item) => item.status === status);
        if (!checks.length) return null;
        return (
          <details key={status} open={status === "Needs attention"}>
            <summary className="cursor-pointer font-semibold">{status} ({checks.length})</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {checks.map((check, i) => <li key={i}>{check.title}</li>)}
            </ul>
          </details>
        );
      })}
      {photos.isError && <p role="alert" className="text-sm">Report photos could not be loaded.</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.data?.map((photo, i) => photo.signedUrl && (
          <a key={photo.path} href={photo.signedUrl} target="_blank" rel="noreferrer">
            <img src={photo.signedUrl} alt={`Visit report photo ${i + 1}`} loading="lazy"
              className="aspect-square w-full rounded-sm object-cover" />
          </a>
        ))}
      </div>
    </div>
  );
}
