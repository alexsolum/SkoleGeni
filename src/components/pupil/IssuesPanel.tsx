import type { FailedImportSummary, PupilIssue } from "../../lib/pupilWorkflow";

function IssueList({ issues }: { issues: PupilIssue[] }) {
  if (issues.length === 0) {
    return <div className="text-sm text-muted">None</div>;
  }

  return (
    <ul className="space-y-2 text-sm text-primary">
      {issues.map((issue) => (
        <li key={issue.id} className="rounded-[4px] bg-background/60 px-3 py-2">
          {issue.message}
        </li>
      ))}
    </ul>
  );
}

export function IssuesPanel({
  errors,
  warnings,
  failedImports
}: {
  errors: PupilIssue[];
  warnings: PupilIssue[];
  failedImports: FailedImportSummary[];
}) {
  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-3">
      <section className="rounded-[4px] border border-red-200 bg-red-50/70 p-4">
        <h2 className="font-heading text-sm font-bold text-red-700">Errors</h2>
        <div className="mt-3">
          <IssueList issues={errors} />
        </div>
      </section>

      <section className="rounded-[4px] border border-amber-200 bg-amber-50/70 p-4">
        <h2 className="font-heading text-sm font-bold text-amber-700">Warnings</h2>
        <div className="mt-3">
          <IssueList issues={warnings} />
        </div>
      </section>

      <section className="rounded-[4px] border border-muted/50 bg-surface p-4">
        <h2 className="font-heading text-sm font-bold text-primary">Failed Imports</h2>
        <div className="mt-3">
          {failedImports.length === 0 ? (
            <div className="text-sm text-muted">None</div>
          ) : (
            <ul className="space-y-2 text-sm text-primary">
              {failedImports.map((failedImport) => (
                <li key={`${failedImport.rowNumber}:${failedImport.reason}`} className="rounded-[4px] bg-background/60 px-3 py-2">
                  Row {failedImport.rowNumber}: {failedImport.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
