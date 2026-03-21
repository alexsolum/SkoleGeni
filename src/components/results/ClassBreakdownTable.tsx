import { Link } from "react-router-dom";

import type { Score } from "../../lib/api";

type ClassBreakdownTableProps = {
  classes: Array<{ classIndex: number; pupilIds: string[] }>;
  classScores?: Record<number, Score>;
  worstClassHighlights?: Record<string, number>;
  projectId: string;
};

function getHealthBarClass(score: number) {
  if (score >= 0.8) {
    return "bg-green-500";
  }

  if (score >= 0.6) {
    return "bg-amber-500";
  }

  return "bg-red-500";
}

export function ClassBreakdownTable({
  classes,
  classScores,
  worstClassHighlights,
  projectId
}: ClassBreakdownTableProps) {
  const worstClassIndexes = new Set(Object.values(worstClassHighlights ?? {}));

  return (
    <section className="mt-12 rounded-[4px] border border-[#E2E8F0] bg-surface p-4">
      <div className="font-heading text-[20px] font-bold text-primary">Class Breakdown</div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="border-b border-[#E2E8F0] text-left text-xs uppercase tracking-wide text-muted">
              <th className="h-12 py-3 pr-4 font-body font-normal">Class Name</th>
              <th className="h-12 px-4 py-3 font-body font-normal">Capacity</th>
              <th className="h-12 px-4 py-3 font-body font-normal">Health Score</th>
              <th className="h-12 py-3 pl-4 font-body font-normal">Action</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((groupClass) => {
              const classScore = classScores?.[groupClass.classIndex];
              const percent = classScore ? Math.round(classScore.overall * 100) : null;
              const isWorstClass = worstClassIndexes.has(groupClass.classIndex);

              return (
                <tr
                  key={groupClass.classIndex}
                  className={isWorstClass ? "h-12 bg-amber-50" : "h-12 border-b border-[#E2E8F0] last:border-b-0"}
                >
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-heading text-sm font-bold text-[#0F172A]">
                        Class {groupClass.classIndex + 1}
                      </span>
                      {isWorstClass ? (
                        <span className="rounded-[4px] bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700">
                          Worst class
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-primary">
                    {groupClass.pupilIds.length}/{groupClass.pupilIds.length}
                  </td>
                  <td className="px-4 py-3">
                    {percent === null ? (
                      <span className="font-mono text-sm text-primary">--</span>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm text-primary">{percent}%</span>
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={`h-full rounded-full ${getHealthBarClass(percent / 100)}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="py-3 pl-4">
                    <Link
                      to={`/editor/${projectId}`}
                      className="text-sm text-accent hover:underline"
                    >
                      View Classes
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
