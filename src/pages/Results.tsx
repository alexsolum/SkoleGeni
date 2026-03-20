import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { supabase } from "../lib/supabase";
import ClassCard from "../components/ClassCard";
import type { Chemistry, OptimizeResponse, Pupil, Score } from "../lib/api";

type OptimizationRunRow = {
  result_json: OptimizeResponse;
  score_overall: number | null;
  created_at: string;
};

type PupilsDbRow = {
  id: string;
  name: string;
  gender: Pupil["gender"];
  origin_school: string;
  needs: string;
  zone: string;
};

type ChemistryRow = {
  from_pupil_id: string;
  to_pupil_id: string;
  relationship: "positive" | "negative";
};

function ScoreRadial({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center justify-center">
      <div className="relative w-[128px] h-[128px]">
        <svg viewBox="0 0 120 120" className="w-full h-full">
          <circle cx="60" cy="60" r="52" fill="none" stroke="#E2E8F0" strokeWidth="8" />
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke="#2563EB"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 52}`}
            strokeDashoffset={`${(1 - value) * 2 * Math.PI * 52}`}
            transform="rotate(-90 60 60)"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <div className="font-heading font-bold text-[26px] text-primary leading-tight">{pct}%</div>
          <div className="text-xs text-muted font-mono">Overall</div>
        </div>
      </div>
    </div>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="border border-muted/50 rounded-[4px] p-4 bg-surface">
      <div className="text-xs text-muted font-mono">{label}</div>
      <div className="mt-2 font-mono font-bold text-primary text-[18px]">{pct}%</div>
      <div className="mt-2 h-2 bg-muted/20 rounded-full overflow-hidden">
        <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const SCORE_LABELS: Record<keyof Score, string> = {
  overall: "Overall Satisfaction",
  genderBalance: "Gender Balance",
  originMix: "Origin Mix",
  needsBalance: "Needs Balance",
  locationBalance: "Location Balance",
  chemistry: "Chemistry Links"
};

export default function Results() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [run, setRun] = useState<OptimizeResponse | null>(null);
  const [pupilsById, setPupilsById] = useState<Map<string, Pupil>>(new Map());
  const [chemistryLinks, setChemistryLinks] = useState<Chemistry>({ positive: [], negative: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!projectId) return;
      setLoading(true);
      const [runResult, pupilsResult, chemistryResult] = await Promise.all([
        supabase
          .from("optimization_runs")
          .select("result_json,score_overall,created_at")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle<OptimizationRunRow>(),
        supabase
          .from("pupils")
          .select("id,name,gender,origin_school,needs,zone")
          .eq("project_id", projectId),
        supabase
          .from("chemistry_links")
          .select("from_pupil_id,to_pupil_id,relationship")
          .eq("project_id", projectId)
      ]);

      if (!mounted) return;
      if (runResult.error || !runResult.data) {
        toast.error("No optimization results found. Run the optimizer first.");
        setRun(null);
      } else {
        setRun(runResult.data.result_json);
      }

      if (pupilsResult.error) {
        toast.error("Failed to load pupil names for the results view.");
      }

      const mappedPupils = new Map<string, Pupil>();
      ((pupilsResult.data ?? []) as PupilsDbRow[]).forEach((row) => {
        mappedPupils.set(row.id, {
          id: row.id,
          name: row.name,
          gender: row.gender,
          originSchool: row.origin_school,
          needs: row.needs,
          zone: row.zone
        });
      });
      setPupilsById(mappedPupils);

      if (chemistryResult.error) {
        toast.error("Failed to load chemistry links for the results view.");
      }

      const chemistryRows = (chemistryResult.data ?? []) as ChemistryRow[];
      setChemistryLinks({
        positive: chemistryRows
          .filter((row) => row.relationship === "positive")
          .map((row) => [row.from_pupil_id, row.to_pupil_id] as [string, string]),
        negative: chemistryRows
          .filter((row) => row.relationship === "negative")
          .map((row) => [row.from_pupil_id, row.to_pupil_id] as [string, string])
      });

      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [projectId]);

  const score = run?.score;
  const sacrificedPriorities = run?.debug?.sacrificed_priorities ?? [];
  const worstClassHighlights = run?.debug?.worst_class_highlights ?? {};
  const highlightedCategoriesByClass = useMemo(() => {
    const highlights = new Map<number, Array<keyof Score>>();

    Object.entries(worstClassHighlights).forEach(([category, classIndex]) => {
      if (typeof classIndex !== "number") {
        return;
      }

      const current = highlights.get(classIndex) ?? [];
      current.push(category as keyof Score);
      highlights.set(classIndex, current);
    });

    return highlights;
  }, [worstClassHighlights]);

  const classesCount = run?.classes.length ?? 0;
  const pupilsCount = useMemo(() => {
    if (!run) return 0;
    return run.classes.reduce((acc, c) => acc + c.pupilIds.length, 0);
  }, [run]);

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <div className="mx-auto max-w-[1180px] pt-10">
          <div className="h-10 bg-muted/20 rounded-[4px] animate-pulse w-[280px]" />
          <div className="mt-4 h-10 bg-muted/20 rounded-[4px] animate-pulse w-[620px]" />
        </div>
      </div>
    );
  }

  if (!run || !score) {
    return (
      <div className="min-h-screen p-6">
        <div className="mx-auto max-w-[1180px] pt-10 text-muted">
          No results yet.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-[1180px]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-heading font-bold text-[30px] text-primary">Optimization Results</h1>
            <p className="text-muted text-sm mt-1">
              Generated {classesCount} classes · {pupilsCount} pupils
            </p>
          </div>
          <button
            className="text-accent text-sm hover:underline font-heading"
            onClick={() => navigate(`/pupils/${projectId}`)}
          >
            Back to Pupils
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <div className="border border-muted/50 bg-surface rounded-[4px] p-4 h-full flex items-center justify-center">
              <ScoreRadial value={score.overall} />
            </div>
          </div>
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Meter label="Gender Balance Satisfaction" value={score.genderBalance} />
            <Meter label="Origin Mix Satisfaction" value={score.originMix} />
            <Meter label="Needs Balance Satisfaction" value={score.needsBalance} />
            <Meter label="Location Balance Satisfaction" value={score.locationBalance} />
            <Meter label="Chemistry Satisfaction" value={score.chemistry} />
          </div>
        </div>

        <div className="mt-6 border border-muted/50 bg-surface rounded-[4px] p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="font-heading font-bold text-primary">Tradeoffs and Sacrifices</div>
            <div className="text-xs text-muted font-mono">Explainability for score tradeoffs</div>
          </div>

          {sacrificedPriorities.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              The solver did not report any materially sacrificed priorities in this run.
            </p>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
              {sacrificedPriorities.map((priority) => (
                <div
                  key={priority.key}
                  className="rounded-[4px] border border-amber-200 bg-amber-50/70 px-4 py-3"
                >
                  <div className="font-heading text-sm font-bold text-primary">{priority.label}</div>
                  <p className="mt-1 text-sm text-slate-700">
                    {priority.label} was reduced to {priority.satisfactionPct}% satisfaction in this roster.
                    {priority.gapFromBestPct > 0
                      ? ` That is ${priority.gapFromBestPct} percentage points behind the strongest satisfied priority.`
                      : " This category still required compromise to satisfy the overall roster."}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 border border-muted/50 bg-surface rounded-[4px] p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="font-heading font-bold text-primary">Generated Classes</div>
            <div className="text-xs text-muted font-mono">MVP: Use Class Editor to refine</div>
          </div>

          <div className="mt-3 overflow-x-auto">
            <div className="flex gap-4">
              {run.classes.map((c) => (
                <ClassCard
                  key={c.classIndex}
                  classIndex={c.classIndex}
                  pupilIds={c.pupilIds}
                  pupilsById={pupilsById}
                  classes={run.classes.map((entry) => entry.pupilIds)}
                  chemistryLinks={chemistryLinks}
                  highlightCategories={(highlightedCategoriesByClass.get(c.classIndex) ?? []).map(
                    (category) => SCORE_LABELS[category]
                  )}
                />
              ))}
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              className="h-12 px-6 rounded-[4px] bg-primary text-surface font-heading font-bold text-sm hover:bg-[#0b1224]"
              onClick={() => navigate(`/editor/${projectId}`)}
            >
              Open Class Editor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

