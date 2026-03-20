import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Papa from "papaparse";
import { useNavigate, useParams } from "react-router-dom";

import { CsvMappingModal } from "../components/pupil/CsvMappingModal";
import { IssuesPanel } from "../components/pupil/IssuesPanel";
import {
  optimizeProject,
  saveProjectRosterState,
  type Chemistry,
  type OptimizationConstraints,
  type Pupil
} from "../lib/api";
import {
  autoDetectFieldMap,
  buildImportPreview,
  collectPupilIssues,
  detectCsvHeaders,
  summarizeFailedImports,
  type ExpectedPupilField,
  type FailedImportSummary,
  type PupilFieldMap,
  type RawImportRow
} from "../lib/pupilWorkflow";
import { supabase } from "../lib/supabase";

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

type PupilRow = {
  id: string;
  name: string;
  gender: Pupil["gender"];
  origin_school: string;
  needs: string;
  zone: string;
  project_id: string;
};

type PendingImportState = {
  headers: string[];
  rows: RawImportRow[];
  fieldMap: Partial<PupilFieldMap>;
};

const DEFAULT_CONSTRAINTS: OptimizationConstraints = {
  minClassSize: 20,
  maxClassSize: 25,
  genderPriority: "flexible",
  originPriority: "best_effort",
  locationPriority: "ignore",
  needsPriority: "flexible"
};

const CELL_ERROR_CLASS = "border-red-500 error-cell focus:ring-red-400";

function mapDatabasePupil(row: PupilRow): Pupil {
  return {
    id: row.id,
    name: row.name ?? "",
    gender: row.gender ?? "Other",
    originSchool: row.origin_school ?? "",
    needs: row.needs ?? "",
    zone: row.zone ?? ""
  };
}

export default function PupilData() {
  const navigate = useNavigate();
  const { projectId } = useParams();

  const [constraints, setConstraints] = useState<OptimizationConstraints>(DEFAULT_CONSTRAINTS);
  const [pupils, setPupils] = useState<Pupil[]>([]);
  const [chemistry, setChemistry] = useState<Chemistry>({ positive: [], negative: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [optimizerLoading, setOptimizerLoading] = useState(false);
  const [failedImports, setFailedImports] = useState<FailedImportSummary[]>([]);
  const [pendingImport, setPendingImport] = useState<PendingImportState | null>(null);
  const [touchedFields, setTouchedFields] = useState<Record<string, true>>({});
  const [chemModalFor, setChemModalFor] = useState<null | { pupilId: string; kind: "positive" | "negative" }>(
    null
  );
  const [chemSearch, setChemSearch] = useState("");

  const positiveCount = chemistry.positive.length;
  const negativeCount = chemistry.negative.length;

  const pupilById = useMemo(() => new Map(pupils.map((pupil) => [pupil.id, pupil])), [pupils]);
  const issues = useMemo(() => collectPupilIssues(pupils, chemistry), [pupils, chemistry]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!projectId) {
        return;
      }

      setLoading(true);

      const { data: cData, error: cError } = await supabase
        .from("project_constraints")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle<ProjectConstraintsRow>();

      if (!mounted) {
        return;
      }

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

      if (!mounted) {
        return;
      }

      if (pError) {
        toast.error("Failed to load pupils.");
      } else {
        setPupils(((pData ?? []) as PupilRow[]).map(mapDatabasePupil));
      }

      const { data: chData, error: chError } = await supabase
        .from("chemistry_links")
        .select("from_pupil_id,to_pupil_id,relationship")
        .eq("project_id", projectId);

      if (!mounted) {
        return;
      }

      if (chError) {
        toast.error("Failed to load chemistry links.");
      } else {
        const rows = (chData ?? []) as ChemistryRow[];
        setChemistry({
          positive: rows
            .filter((row) => row.relationship === "positive")
            .map((row) => [row.from_pupil_id, row.to_pupil_id]),
          negative: rows
            .filter((row) => row.relationship === "negative")
            .map((row) => [row.from_pupil_id, row.to_pupil_id])
        });
      }

      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [projectId]);

  function addBlankRow() {
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `p_${Date.now()}`;

    setPupils((rows) => [
      ...rows,
      {
        id,
        name: "",
        gender: "Male",
        originSchool: "",
        needs: "",
        zone: ""
      }
    ]);
  }

  function updatePupil(id: string, patch: Partial<Pupil>) {
    setPupils((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function touchField(pupilId: string, field: ExpectedPupilField) {
    setTouchedFields((current) => ({
      ...current,
      [`${pupilId}:${field}`]: true
    }));
  }

  function isCellInvalid(pupilId: string, field: ExpectedPupilField) {
    return Boolean(touchedFields[`${pupilId}:${field}`] && issues.fieldErrors[pupilId]?.[field]);
  }

  function applyImport(rows: RawImportRow[], fieldMap: PupilFieldMap) {
    const preview = buildImportPreview(rows, fieldMap);

    if (preview.validRows.length === 0 && preview.failedRows.length === 0) {
      toast.error("CSV import produced no pupils. Check column headers.");
      return;
    }

    if (preview.validRows.length > 0) {
      setPupils((current) => [...current, ...preview.validRows]);
    }

    setFailedImports(summarizeFailedImports(preview.failedRows));
    setPendingImport(null);
  }

  function onCSVFile(file: File) {
    Papa.parse<RawImportRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result: Papa.ParseResult<RawImportRow>) => {
        const rows = (result.data ?? []) as RawImportRow[];
        const headers = result.meta?.fields?.length ? result.meta.fields : detectCsvHeaders(rows);
        const { fieldMap, missingFields } = autoDetectFieldMap(headers);

        if (rows.length === 0) {
          toast.error("CSV import produced no pupils. Check column headers.");
          return;
        }

        if (missingFields.length > 0) {
          setPendingImport({
            headers,
            rows,
            fieldMap
          });
          return;
        }

        applyImport(rows, fieldMap as PupilFieldMap);
      },
      error: () => toast.error("Failed to parse CSV.")
    });
  }

  function validateMandatory() {
    if (issues.errors.length > 0) {
      return issues.errors.map((issue) => issue.message);
    }

    if (pupils.length === 0) {
      return ["Add at least one pupil."];
    }

    return [];
  }

  async function saveToSupabase() {
    if (!projectId) {
      return;
    }

    setSaving(true);

    try {
      await saveProjectRosterState(projectId, pupils, chemistry);
    } finally {
      setSaving(false);
    }
  }

  function addChemLink(fromId: string, toId: string, kind: "positive" | "negative") {
    if (fromId === toId) {
      return;
    }

    setChemistry((current) => {
      const list = kind === "positive" ? current.positive : current.negative;
      const pairExists = list.some(([existingFromId, existingToId]) => existingFromId === fromId && existingToId === toId);
      const nextList = pairExists ? list : [...list, [fromId, toId] as [string, string]];

      return kind === "positive"
        ? { ...current, positive: nextList }
        : { ...current, negative: nextList };
    });
  }

  async function runOptimizer() {
    if (!projectId) {
      return;
    }

    const errs = validateMandatory();
    if (errs.length > 0) {
      toast.error(errs[0]);
      return;
    }

    setOptimizerLoading(true);

    try {
      await saveToSupabase();
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const result = await optimizeProject(projectId);

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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Optimizer failed.");
    } finally {
      setOptimizerLoading(false);
    }
  }

  const chemCandidates = useMemo(() => {
    const query = chemSearch.trim().toLowerCase();

    if (!query) {
      return pupils.filter((pupil) => pupil.id !== chemModalFor?.pupilId);
    }

    return pupils
      .filter((pupil) => pupil.id !== chemModalFor?.pupilId)
      .filter((pupil) => pupil.name.toLowerCase().includes(query));
  }, [chemSearch, pupils, chemModalFor]);

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <div className="mx-auto max-w-[1180px] pt-10">
          <div className="h-10 w-[380px] animate-pulse rounded-[4px] bg-muted/20" />
          <div className="mt-4 h-10 w-[620px] animate-pulse rounded-[4px] bg-muted/20" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-[1180px]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-[30px] font-bold text-primary">Pupil Mode</h1>
            <p className="mt-1 text-sm text-muted">Bulk entry and relationship dynamics.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="font-heading text-sm text-accent hover:underline"
              onClick={() => navigate(`/configure/${projectId}`)}
              disabled={saving || optimizerLoading}
            >
              Edit Constraints
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-[4px] border border-muted/50 bg-surface p-4">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="font-heading text-sm font-bold text-primary">Students</div>
              <div className="mt-1 font-mono text-xs text-muted">
                Positive Links: {positiveCount} · Negative Blocks: {negativeCount}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex h-11 cursor-pointer items-center rounded-[4px] border border-primary bg-surface px-4 text-sm font-heading font-bold text-primary">
                Import CSV
                <input
                  type="file"
                  accept=".csv"
                  aria-label="Import CSV"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      onCSVFile(file);
                    }
                    event.currentTarget.value = "";
                  }}
                  disabled={saving || optimizerLoading}
                />
              </label>

              <button
                className="h-11 rounded-[4px] border border-muted bg-background px-4 text-sm font-heading font-bold text-primary hover:bg-background/70 disabled:opacity-60"
                onClick={addBlankRow}
                disabled={saving || optimizerLoading}
              >
                Add Row
              </button>
            </div>
          </div>

          {pupils.length === 0 ? (
            <div className="mt-6 rounded-[4px] border border-dashed border-muted p-8 text-center">
              <div className="font-heading font-bold text-primary">Upload CSV or add row manually</div>
              <div className="mt-2 text-sm text-muted">We’ll parse your CSV and generate classes.</div>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-[980px] w-full border-collapse">
                <thead>
                  <tr className="text-left font-mono text-xs text-muted">
                    <th className="border-b border-muted/50 p-3">Student Name</th>
                    <th className="border-b border-muted/50 p-3">Origin School</th>
                    <th className="border-b border-muted/50 p-3">Gender</th>
                    <th className="border-b border-muted/50 p-3">Needs</th>
                    <th className="border-b border-muted/50 p-3">Location / Zone</th>
                    <th className="border-b border-muted/50 p-3">Chemistry</th>
                  </tr>
                </thead>
                <tbody>
                  {pupils.map((pupil, index) => (
                    <tr key={pupil.id} className={index % 2 === 0 ? "bg-background/40" : ""}>
                      <td className="border-b border-muted/30 p-2">
                        <input
                          className={`w-full rounded-[4px] border border-muted/50 bg-transparent px-2 py-2 text-sm font-body outline-none focus:ring-2 focus:ring-accent ${isCellInvalid(pupil.id, "name") ? CELL_ERROR_CLASS : ""}`}
                          value={pupil.name}
                          onChange={(event) => updatePupil(pupil.id, { name: event.target.value })}
                          onBlur={() => touchField(pupil.id, "name")}
                          placeholder="Name"
                          disabled={saving || optimizerLoading}
                        />
                      </td>
                      <td className="border-b border-muted/30 p-2">
                        <input
                          className={`w-full rounded-[4px] border border-muted/50 bg-transparent px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-accent ${isCellInvalid(pupil.id, "originSchool") ? CELL_ERROR_CLASS : ""}`}
                          value={pupil.originSchool}
                          onChange={(event) => updatePupil(pupil.id, { originSchool: event.target.value })}
                          onBlur={() => touchField(pupil.id, "originSchool")}
                          placeholder="e.g. Oakridge Elem."
                          disabled={saving || optimizerLoading}
                        />
                      </td>
                      <td className="border-b border-muted/30 p-2">
                        <select
                          className="w-full rounded-[4px] border border-muted/50 bg-transparent px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
                          value={pupil.gender}
                          onChange={(event) => updatePupil(pupil.id, { gender: event.target.value as Pupil["gender"] })}
                          disabled={saving || optimizerLoading}
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </td>
                      <td className="border-b border-muted/30 p-2">
                        <input
                          className={`w-full rounded-[4px] border border-muted/50 bg-transparent px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-accent ${isCellInvalid(pupil.id, "needs") ? CELL_ERROR_CLASS : ""}`}
                          value={pupil.needs}
                          onChange={(event) => updatePupil(pupil.id, { needs: event.target.value })}
                          onBlur={() => touchField(pupil.id, "needs")}
                          placeholder="e.g. Reading support"
                          disabled={saving || optimizerLoading}
                        />
                      </td>
                      <td className="border-b border-muted/30 p-2">
                        <input
                          className={`w-full rounded-[4px] border border-muted/50 bg-transparent px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-accent ${isCellInvalid(pupil.id, "zone") ? CELL_ERROR_CLASS : ""}`}
                          value={pupil.zone}
                          onChange={(event) => updatePupil(pupil.id, { zone: event.target.value })}
                          onBlur={() => touchField(pupil.id, "zone")}
                          placeholder="e.g. Zone A"
                          disabled={saving || optimizerLoading}
                        />
                      </td>
                      <td className="border-b border-muted/30 p-2">
                        <div className="flex items-center gap-2">
                          <button
                            className="h-9 w-9 rounded-[4px] border border-muted bg-surface font-heading font-bold text-primary"
                            onClick={() => {
                              setChemSearch("");
                              setChemModalFor({ pupilId: pupil.id, kind: "positive" });
                            }}
                            disabled={saving || optimizerLoading}
                            title="Positive chemistry (+)"
                          >
                            +
                          </button>
                          <button
                            className="h-9 w-9 rounded-[4px] border border-muted bg-surface font-heading font-bold text-primary"
                            onClick={() => {
                              setChemSearch("");
                              setChemModalFor({ pupilId: pupil.id, kind: "negative" });
                            }}
                            disabled={saving || optimizerLoading}
                            title="Negative chemistry / do-not-match (-)"
                          >
                            -
                          </button>
                        </div>
                        <div className="mt-2 font-mono text-xs text-muted">
                          +{chemistry.positive.filter(([fromId]) => fromId === pupil.id).length} / -
                          {chemistry.negative.filter(([fromId]) => fromId === pupil.id).length}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <IssuesPanel
            errors={issues.errors}
            warnings={issues.warnings}
            failedImports={failedImports}
          />

          <div className="mt-5 flex items-center justify-end">
            <button
              className="h-12 rounded-[4px] bg-accent px-6 text-sm font-heading font-bold text-surface disabled:cursor-not-allowed disabled:opacity-60"
              onClick={runOptimizer}
              disabled={pupils.length === 0 || saving || optimizerLoading || issues.errors.length > 0}
            >
              {optimizerLoading ? "Running Optimizer..." : "Run Optimizer"}
            </button>
          </div>
        </div>

        {pendingImport && (
          <CsvMappingModal
            headers={pendingImport.headers}
            fieldMap={pendingImport.fieldMap}
            onChange={(field, header) =>
              setPendingImport((current) =>
                current
                  ? {
                      ...current,
                      fieldMap: {
                        ...current.fieldMap,
                        [field]: header
                      }
                    }
                  : current
              )
            }
            onCancel={() => setPendingImport(null)}
            onApply={() => applyImport(pendingImport.rows, pendingImport.fieldMap as PupilFieldMap)}
          />
        )}

        {chemModalFor && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-6">
            <div className="w-full max-w-[520px] rounded-[4px] border border-muted/50 bg-surface p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-heading font-bold text-primary">
                    Chemistry {chemModalFor.kind === "positive" ? "(+)" : "(-)"} Picker
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    From: {pupilById.get(chemModalFor.pupilId)?.name || "Unknown"}
                  </div>
                </div>
                <button className="text-muted hover:text-primary" onClick={() => setChemModalFor(null)}>
                  Close
                </button>
              </div>

              <div className="mt-4">
                <input
                  className="w-full rounded-[4px] border border-muted/50 px-3 py-2 outline-none focus:ring-2 focus:ring-accent"
                  placeholder="Search pupils..."
                  value={chemSearch}
                  onChange={(event) => setChemSearch(event.target.value)}
                />
              </div>

              <div className="mt-3 max-h-[280px] overflow-auto rounded-[4px] border border-muted/40">
                {chemCandidates.length === 0 ? (
                  <div className="p-3 text-sm text-muted">No matches.</div>
                ) : (
                  chemCandidates.map((pupil) => (
                    <button
                      key={pupil.id}
                      className="w-full border-b border-muted/30 px-3 py-2 text-left hover:bg-background/60 last:border-b-0"
                      onClick={() => {
                        addChemLink(chemModalFor.pupilId, pupil.id, chemModalFor.kind);
                        setChemModalFor(null);
                      }}
                    >
                      <div className="font-heading text-sm font-bold text-primary">{pupil.name}</div>
                      <div className="font-mono text-xs text-muted">
                        {pupil.originSchool} · {pupil.gender}
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
