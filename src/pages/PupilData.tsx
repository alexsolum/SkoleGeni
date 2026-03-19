import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import Papa from "papaparse";

import { supabase } from "../lib/supabase";
import {
  optimizeProject,
  saveProjectRosterState,
  type Chemistry,
  type OptimizationConstraints,
  type Pupil,
} from "../lib/api";

type ProjectConstraintsRow = {
  min_class_size: number;
  max_class_size: number;
  gender_priority: "strict" | "flexible" | "ignore";
  origin_priority: "strict" | "flexible" | "best_effort" | "ignore";
  location_priority: "strict" | "flexible" | "ignore" | "not_considered";
  needs_priority: "strict" | "flexible";
};

type ChemistryRow = {
  from_pupil_id: string;
  to_pupil_id: string;
  relationship: "positive" | "negative";
};

type PupilRow = Pupil & { project_id: string };

const DEFAULT_CONSTRAINTS: OptimizationConstraints = {
  minClassSize: 20,
  maxClassSize: 25,
  genderPriority: "flexible",
  originPriority: "best_effort",
  locationPriority: "ignore",
  needsPriority: "flexible"
};

export default function PupilData() {
  const navigate = useNavigate();
  const { projectId } = useParams();

  const [constraints, setConstraints] = useState<OptimizationConstraints>(DEFAULT_CONSTRAINTS);
  const [pupils, setPupils] = useState<Pupil[]>([]);
  const [chemistry, setChemistry] = useState<Chemistry>({ positive: [], negative: [] });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [optimizerLoading, setOptimizerLoading] = useState(false);

  const [chemModalFor, setChemModalFor] = useState<null | { pupilId: string; kind: "positive" | "negative" }>(
    null
  );
  const [chemSearch, setChemSearch] = useState("");

  const positiveCount = chemistry.positive.length;
  const negativeCount = chemistry.negative.length;

  const pupilById = useMemo(() => new Map(pupils.map((p) => [p.id, p])), [pupils]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!projectId) return;
      setLoading(true);

      const { data: cData, error: cError } = await supabase
        .from("project_constraints")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();

      if (!mounted) return;
      if (cError) {
        toast.error("Failed to load constraints. Using defaults.");
      } else if (cData) {
        setConstraints({
          minClassSize: cData.min_class_size,
          maxClassSize: cData.max_class_size,
          genderPriority: cData.gender_priority,
          originPriority: cData.origin_priority,
          locationPriority: cData.location_priority,
          needsPriority: cData.needs_priority
        });
      }

      const { data: pData, error: pError } = await supabase
        .from("pupils")
        .select("id,name,gender,origin_school,needs,zone,project_id")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });

      if (!mounted) return;
      if (pError) {
        toast.error("Failed to load pupils.");
      } else {
        setPupils((pData ?? []) as unknown as PupilRow[]);
      }

      const { data: chData, error: chError } = await supabase
        .from("chemistry_links")
        .select("from_pupil_id,to_pupil_id,relationship")
        .eq("project_id", projectId);

      if (!mounted) return;
      if (chError) {
        toast.error("Failed to load chemistry links.");
      } else {
        const rows = (chData ?? []) as ChemistryRow[];
        setChemistry({
          positive: rows
            .filter((r) => r.relationship === "positive")
            .map((r) => [r.from_pupil_id, r.to_pupil_id]),
          negative: rows
            .filter((r) => r.relationship === "negative")
            .map((r) => [r.from_pupil_id, r.to_pupil_id])
        });
      }

      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [projectId]);

  function ensureRowDefaults(row: Pupil): Pupil {
    return {
      ...row,
      gender: row.gender ?? "Male",
      needs: row.needs ?? "",
      zone: row.zone ?? ""
    };
  }

  function addBlankRow() {
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `p_${Date.now()}`;
    setPupils((rows) => [
      ...rows,
      ensureRowDefaults({
        id,
        name: "",
        gender: "Male",
        originSchool: "",
        needs: "",
        zone: ""
      })
    ]);
  }

  function updatePupil(id: string, patch: Partial<Pupil>) {
    setPupils((rows) => rows.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function validateMandatory(): string[] {
    const errs: string[] = [];
    if (pupils.length === 0) errs.push("Add at least one pupil.");
    pupils.forEach((p, idx) => {
      if (!p.name.trim()) errs.push(`Row ${idx + 1}: missing student name.`);
      if (!p.originSchool.trim()) errs.push(`Row ${idx + 1}: missing origin school.`);
      if (!p.needs.trim()) errs.push(`Row ${idx + 1}: missing academic needs.`);
      if (!p.zone.trim()) errs.push(`Row ${idx + 1}: missing location/zone.`);
    });
    return errs;
  }

  async function saveToSupabase() {
    if (!projectId) return;
    setSaving(true);
    try {
      await saveProjectRosterState(projectId, pupils, chemistry);
    } finally {
      setSaving(false);
    }
  }

  function addChemLink(fromId: string, toId: string, kind: "positive" | "negative") {
    if (fromId === toId) return;
    setChemistry((c) => {
      const list = kind === "positive" ? c.positive : c.negative;
      const pairExists = list.some((p) => p[0] === fromId && p[1] === toId);
      const nextList = pairExists ? list : [...list, [fromId, toId] as [string, string]];
      return kind === "positive" ? { ...c, positive: nextList } : { ...c, negative: nextList };
    });
  }

  function onCSVFile(file: File) {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result: Papa.ParseResult<Record<string, unknown>>) => {
        const data = (result.data ?? []) as Array<Record<string, unknown>>;
        const parsed: Pupil[] = data
          .map((r) => {
            const id =
              typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `p_${Date.now()}`;
            const gender = (String(r.gender ?? "").trim() as any) || "Male";
            const gNormalized =
              gender.toLowerCase().includes("female")
                ? "Female"
                : gender.toLowerCase().includes("male")
                  ? "Male"
                  : "Other";

            return {
              id,
              name: String(r.name ?? r.student_name ?? "").trim(),
              originSchool: String(r.origin_school ?? r.originSchool ?? "").trim(),
              gender: gNormalized,
              needs: String(r.needs ?? "").trim(),
              zone: String(r.zone ?? r.location ?? r.location_zone ?? "").trim()
            } satisfies Pupil;
          })
          .filter((p) => p.name);

        if (parsed.length === 0) {
          toast.error("CSV import produced no pupils. Check column headers.");
          return;
        }

        setPupils(parsed);
      },
      error: () => toast.error("Failed to parse CSV.")
    });
  }

  async function runOptimizer() {
    if (!projectId) return;

    const errs = validateMandatory();
    if (errs.length > 0) {
      toast.error(errs[0]);
      return;
    }

    setOptimizerLoading(true);
    try {
      await saveToSupabase();

      // Ensure the UX has the PRD's 3s "complex loading" feel.
      await new Promise((r) => setTimeout(r, 3000));

      const result = await optimizeProject(projectId);

      // Persist latest optimization run for this project.
      const { error: runError } = await supabase.from("optimization_runs").insert({
        project_id: projectId,
        constraints,
        result_json: result,
        score_overall: result.score.overall
      });

      if (runError) {
        toast.error("Optimization ran, but saving results failed.");
      } else {
        toast.success("Classes generated.");
      }

      navigate(`/results/${projectId}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Optimizer failed.");
    } finally {
      setOptimizerLoading(false);
    }
  }

  const chemCandidates = useMemo(() => {
    const q = chemSearch.trim().toLowerCase();
    if (!q) return pupils.filter((p) => p.id !== chemModalFor?.pupilId);
    return pupils
      .filter((p) => p.id !== chemModalFor?.pupilId)
      .filter((p) => p.name.toLowerCase().includes(q));
  }, [chemSearch, pupils, chemModalFor]);

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <div className="mx-auto max-w-[1180px] pt-10">
          <div className="h-10 bg-muted/20 rounded-[4px] animate-pulse w-[380px]" />
          <div className="mt-4 h-10 bg-muted/20 rounded-[4px] animate-pulse w-[620px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-[1180px]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-heading font-bold text-[30px] text-primary">Pupil Mode</h1>
            <p className="text-muted text-sm mt-1">Bulk entry and relationship dynamics.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="text-accent text-sm hover:underline font-heading"
              onClick={() => navigate(`/configure/${projectId}`)}
              disabled={saving || optimizerLoading}
            >
              Edit Constraints
            </button>
          </div>
        </div>

        <div className="mt-6 border border-muted/50 bg-surface rounded-[4px] p-4">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="text-sm font-heading font-bold text-primary">Students</div>
              <div className="mt-1 text-xs text-muted font-mono">
                Positive Links: {positiveCount} · Negative Blocks: {negativeCount}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="h-11 px-4 rounded-[4px] border border-primary bg-surface text-primary font-heading font-bold text-sm cursor-pointer flex items-center">
                Import CSV
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onCSVFile(f);
                    e.currentTarget.value = "";
                  }}
                  disabled={saving || optimizerLoading}
                />
              </label>
              <button
                className="h-11 px-4 rounded-[4px] border border-muted bg-background text-primary font-heading font-bold text-sm hover:bg-background/70 disabled:opacity-60"
                onClick={addBlankRow}
                disabled={saving || optimizerLoading}
              >
                Add Row
              </button>
            </div>
          </div>

          {pupils.length === 0 ? (
            <div className="mt-6 border border-dashed border-muted rounded-[4px] p-8 text-center">
              <div className="font-heading font-bold text-primary">Upload CSV or add row manually</div>
              <div className="mt-2 text-muted text-sm">We’ll parse your CSV and generate classes.</div>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-[980px] w-full border-collapse">
                <thead>
                  <tr className="text-left text-muted text-xs font-mono">
                    <th className="p-3 border-b border-muted/50">Student Name</th>
                    <th className="p-3 border-b border-muted/50">Origin School</th>
                    <th className="p-3 border-b border-muted/50">Gender</th>
                    <th className="p-3 border-b border-muted/50">Needs</th>
                    <th className="p-3 border-b border-muted/50">Location / Zone</th>
                    <th className="p-3 border-b border-muted/50">Chemistry</th>
                  </tr>
                </thead>
                <tbody>
                  {pupils.map((p, idx) => (
                    <tr key={p.id} className={idx % 2 === 0 ? "bg-background/40" : ""}>
                      <td className="p-2 border-b border-muted/30">
                        <input
                          className="w-full bg-transparent border border-muted/50 rounded-[4px] px-2 py-2 text-sm font-body outline-none focus:ring-2 focus:ring-accent"
                          value={p.name}
                          onChange={(e) => updatePupil(p.id, { name: e.target.value })}
                          placeholder="Name"
                          disabled={saving || optimizerLoading}
                        />
                      </td>
                      <td className="p-2 border-b border-muted/30">
                        <input
                          className="w-full bg-transparent border border-muted/50 rounded-[4px] px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
                          value={p.originSchool}
                          onChange={(e) => updatePupil(p.id, { originSchool: e.target.value })}
                          placeholder="e.g. Oakridge Elem."
                          disabled={saving || optimizerLoading}
                        />
                      </td>
                      <td className="p-2 border-b border-muted/30">
                        <select
                          className="w-full bg-transparent border border-muted/50 rounded-[4px] px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
                          value={p.gender}
                          onChange={(e) => updatePupil(p.id, { gender: e.target.value as Pupil["gender"] })}
                          disabled={saving || optimizerLoading}
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </td>
                      <td className="p-2 border-b border-muted/30">
                        <input
                          className="w-full bg-transparent border border-muted/50 rounded-[4px] px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
                          value={p.needs}
                          onChange={(e) => updatePupil(p.id, { needs: e.target.value })}
                          placeholder="e.g. Reading support"
                          disabled={saving || optimizerLoading}
                        />
                      </td>
                      <td className="p-2 border-b border-muted/30">
                        <input
                          className="w-full bg-transparent border border-muted/50 rounded-[4px] px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
                          value={p.zone}
                          onChange={(e) => updatePupil(p.id, { zone: e.target.value })}
                          placeholder="e.g. Zone A"
                          disabled={saving || optimizerLoading}
                        />
                      </td>
                      <td className="p-2 border-b border-muted/30">
                        <div className="flex items-center gap-2">
                          <button
                            className="w-9 h-9 rounded-[4px] border border-muted bg-surface text-primary font-heading font-bold"
                            onClick={() => {
                              setChemSearch("");
                              setChemModalFor({ pupilId: p.id, kind: "positive" });
                            }}
                            disabled={saving || optimizerLoading}
                            title="Positive chemistry (+)"
                          >
                            +
                          </button>
                          <button
                            className="w-9 h-9 rounded-[4px] border border-muted bg-surface text-primary font-heading font-bold"
                            onClick={() => {
                              setChemSearch("");
                              setChemModalFor({ pupilId: p.id, kind: "negative" });
                            }}
                            disabled={saving || optimizerLoading}
                            title="Negative chemistry / do-not-match (-)"
                          >
                            -
                          </button>
                        </div>
                        <div className="mt-2 text-xs text-muted font-mono">
                          +{chemistry.positive.filter((x) => x[0] === p.id).length} / -{chemistry.negative.filter((x) => x[0] === p.id).length}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-5 flex items-center justify-end">
            <button
              className="h-12 px-6 rounded-[4px] bg-accent text-surface font-heading font-bold text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={runOptimizer}
              disabled={pupils.length === 0 || saving || optimizerLoading}
            >
              {optimizerLoading ? "Running Optimizer..." : "Run Optimizer"}
            </button>
          </div>
        </div>

        {/* Chemistry modal */}
        {chemModalFor && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6">
            <div className="w-full max-w-[520px] bg-surface border border-muted/50 rounded-[4px] p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-heading font-bold text-primary">
                    Chemistry {chemModalFor.kind === "positive" ? "(+)" : "(-)"} Picker
                  </div>
                  <div className="text-xs text-muted mt-1">
                    From: {pupilById.get(chemModalFor.pupilId)?.name || "Unknown"}
                  </div>
                </div>
                <button
                  className="text-muted hover:text-primary"
                  onClick={() => setChemModalFor(null)}
                >
                  Close
                </button>
              </div>

              <div className="mt-4">
                <input
                  className="w-full border border-muted/50 rounded-[4px] px-3 py-2 outline-none focus:ring-2 focus:ring-accent"
                  placeholder="Search pupils..."
                  value={chemSearch}
                  onChange={(e) => setChemSearch(e.target.value)}
                />
              </div>

              <div className="mt-3 max-h-[280px] overflow-auto border border-muted/40 rounded-[4px]">
                {chemCandidates.length === 0 ? (
                  <div className="p-3 text-muted text-sm">No matches.</div>
                ) : (
                  chemCandidates.map((p) => (
                    <button
                      key={p.id}
                      className="w-full text-left px-3 py-2 hover:bg-background/60 border-b border-muted/30 last:border-b-0"
                      onClick={() => {
                        addChemLink(chemModalFor.pupilId, p.id, chemModalFor.kind);
                        setChemModalFor(null);
                      }}
                    >
                      <div className="font-heading font-bold text-sm text-primary">{p.name}</div>
                      <div className="text-xs text-muted font-mono">
                        {p.originSchool} · {p.gender}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

