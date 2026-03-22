import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import Papa from "papaparse";
import { useNavigate, useParams } from "react-router-dom";

import { CsvMappingModal } from "../components/pupil/CsvMappingModal";
import { ChemistryStatCards } from "../components/pupil/ChemistryStatCards";
import { IssuesPanel } from "../components/pupil/IssuesPanel";
import { WorkflowStatusHeader } from "../components/project/WorkflowStatusHeader";
import {
  OptimizerRequestError,
  optimizeProject,
  saveProjectRosterState,
  type Chemistry,
  type DiagnosticResponse,
  type OptimizationConstraints,
  type Pupil
} from "../lib/api";
import type { WorkflowSaveState } from "../lib/projectWorkflow";
import {
  autoDetectFieldMap,
  buildImportPreview,
  clearRosterDraft,
  collectPupilIssues,
  createRosterAutosave,
  detectCsvHeaders,
  readRosterDraft,
  summarizeFailedImports,
  writeRosterDraft,
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

function mergeDraftPupils(savedPupils: Pupil[], draftPupils: Pupil[] | null) {
  if (!draftPupils || draftPupils.length === 0) {
    return savedPupils;
  }

  const savedById = new Map(savedPupils.map((pupil) => [pupil.id, pupil]));
  const draftById = new Map(draftPupils.map((pupil) => [pupil.id, pupil]));
  const merged: Pupil[] = savedPupils.map((savedPupil) => draftById.get(savedPupil.id) ?? savedPupil);

  draftPupils.forEach((draftPupil) => {
    if (!savedById.has(draftPupil.id)) {
      merged.push(draftPupil);
    }
  });

  return merged;
}

export default function PupilData() {
  const navigate = useNavigate();
  const { projectId } = useParams();

  const [constraints, setConstraints] = useState<OptimizationConstraints>(DEFAULT_CONSTRAINTS);
  const [pupils, setPupils] = useState<Pupil[]>([]);
  const [chemistry, setChemistry] = useState<Chemistry>({ positive: [], negative: [] });
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<WorkflowSaveState>("loading");
  const [hasQueuedSave, setHasQueuedSave] = useState(false);
  const [failedImports, setFailedImports] = useState<FailedImportSummary[]>([]);
  const [pendingImport, setPendingImport] = useState<PendingImportState | null>(null);
  const [touchedFields, setTouchedFields] = useState<Record<string, true>>({});
  const [chemModalFor, setChemModalFor] = useState<null | { pupilId: string; kind: "positive" | "negative" }>(
    null
  );
  const [chemSearch, setChemSearch] = useState("");
  const [optimizerLoading, setOptimizerLoading] = useState(false);
  const [optimizerDiagnostics, setOptimizerDiagnostics] = useState<DiagnosticResponse | null>(null);

  const pupilsRef = useRef<Pupil[]>([]);
  const chemistryRef = useRef<Chemistry>({ positive: [], negative: [] });
  const autosaveRef = useRef<ReturnType<typeof createRosterAutosave> | null>(null);
  const hydrationCompleteRef = useRef(false);
  const pendingSaveReasonRef = useRef<"autosave" | "retry" | null>(null);

  const positiveCount = chemistry.positive.length;
  const negativeCount = chemistry.negative.length;

  const pupilById = useMemo(() => new Map(pupils.map((pupil) => [pupil.id, pupil])), [pupils]);
  const issues = useMemo(() => collectPupilIssues(pupils, chemistry), [pupils, chemistry]);
  const hasBlockingIssues = issues.errors.length > 0;

  useEffect(() => {
    pupilsRef.current = pupils;
  }, [pupils]);

  useEffect(() => {
    chemistryRef.current = chemistry;
  }, [chemistry]);

  useEffect(() => {
    if (!projectId) {
      setSaveState("blocked");
      return;
    }

    autosaveRef.current?.cancel();
    autosaveRef.current = createRosterAutosave({
      delayMs: 2000,
      onSave: async () => {
        await saveProjectRosterState(projectId, pupilsRef.current, chemistryRef.current);
        clearRosterDraft(projectId);
      },
      onStateChange: (state) => {
        if (state === "queued") {
          setHasQueuedSave(true);
          setSaveState("idle");
        } else if (state === "saving") {
          setHasQueuedSave(false);
          setSaveState("saving");
        } else if (state === "saved") {
          setHasQueuedSave(false);
          setSaveState("saved");
        } else if (state === "error") {
          setHasQueuedSave(false);
          setSaveState("error");
          writeRosterDraft(projectId, pupilsRef.current, chemistryRef.current);
        }
      }
    });

    return () => {
      autosaveRef.current?.cancel();
    };
  }, [projectId]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!projectId) {
        return;
      }

      setLoading(true);
      setSaveState("loading");
      hydrationCompleteRef.current = false;

      const draft = readRosterDraft(projectId);
      if (draft.pupils) {
        setPupils(draft.pupils);
      }
      if (draft.chemistry) {
        setChemistry(draft.chemistry);
      }

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

      const savedPupils = pError ? [] : ((pData ?? []) as PupilRow[]).map(mapDatabasePupil);
      if (pError) {
        toast.error("Failed to load pupils.");
      }

      const { data: chData, error: chError } = await supabase
        .from("chemistry_links")
        .select("from_pupil_id,to_pupil_id,relationship")
        .eq("project_id", projectId);

      if (!mounted) {
        return;
      }

      const savedChemistry = chError
        ? { positive: [], negative: [] }
        : {
            positive: ((chData ?? []) as ChemistryRow[])
              .filter((row) => row.relationship === "positive")
              .map((row) => [row.from_pupil_id, row.to_pupil_id] as [string, string]),
            negative: ((chData ?? []) as ChemistryRow[])
              .filter((row) => row.relationship === "negative")
              .map((row) => [row.from_pupil_id, row.to_pupil_id] as [string, string])
          };

      if (chError) {
        toast.error("Failed to load chemistry links.");
      }

      setPupils(mergeDraftPupils(savedPupils, draft.pupils));
      setChemistry(draft.chemistry ?? savedChemistry);
      setLoading(false);
      hydrationCompleteRef.current = true;
      setSaveState(draft.pupils || draft.chemistry ? "blocked" : "saved");
    })();

    return () => {
      mounted = false;
    };
  }, [projectId]);

  useEffect(() => {
    if (!projectId || loading || !hydrationCompleteRef.current) {
      return;
    }

    if (hasBlockingIssues) {
      autosaveRef.current?.cancel();
      setHasQueuedSave(false);
      setSaveState("blocked");
      writeRosterDraft(projectId, pupils, chemistry);
      return;
    }

    if (pendingSaveReasonRef.current) {
      pendingSaveReasonRef.current = null;
      autosaveRef.current?.queue();
    }
  }, [chemistry, hasBlockingIssues, loading, projectId, pupils]);

  function queueAutosave() {
    if (!projectId || loading || !hydrationCompleteRef.current) {
      return;
    }

    pendingSaveReasonRef.current = "autosave";
  }

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
    queueAutosave();
  }

  function updatePupil(id: string, patch: Partial<Pupil>) {
    setPupils((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    queueAutosave();
  }

  function updateChemistry(nextChemistry: Chemistry | ((current: Chemistry) => Chemistry)) {
    setChemistry((current) => {
      const resolved = typeof nextChemistry === "function" ? nextChemistry(current) : nextChemistry;
      return resolved;
    });
    queueAutosave();
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
      queueAutosave();
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

  async function retrySave() {
    if (!projectId || hasBlockingIssues) {
      return;
    }

    try {
      await autosaveRef.current?.retry();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed.");
    }
  }

  function addChemLink(fromId: string, toId: string, kind: "positive" | "negative") {
    if (fromId === toId) {
      return;
    }

    updateChemistry((current) => {
      const list = kind === "positive" ? current.positive : current.negative;
      const pairExists = list.some(
        ([existingFromId, existingToId]) => existingFromId === fromId && existingToId === toId
      );
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

    if (hasQueuedSave) {
      try {
        await autosaveRef.current?.flush();
      } catch {
        return;
      }
    }

    if (
      pupils.length === 0 ||
      saveState === "saving" ||
      hasQueuedSave ||
      saveState === "error" ||
      saveState === "blocked" ||
      hasBlockingIssues
    ) {
      return;
    }

    setOptimizerLoading(true);
    setOptimizerDiagnostics(null);

    try {
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
      if (error instanceof OptimizerRequestError && error.status === 401) {
        toast.error("Your session has expired. Please sign in again.");
        await supabase.auth.signOut();
        navigate("/");
      } else if (error instanceof OptimizerRequestError && error.status === 400 && error.diagnostic) {
        setOptimizerDiagnostics(error.diagnostic);
        toast.error(
          error.diagnostic.violations
            .map((violation) => `${violation.message}\nSuggestion: ${violation.suggestion}`)
            .join("\n\n"),
          { duration: 8000 }
        );
      } else {
        toast.error(error instanceof Error ? error.message : "Optimizer failed.");
      }
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

  const optimizerDisabled =
    pupils.length === 0 ||
    saveState === "saving" ||
    hasQueuedSave ||
    saveState === "error" ||
    saveState === "blocked" ||
    hasBlockingIssues ||
    optimizerLoading;

  if (loading) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-[1180px] pt-10">
          <div className="h-10 w-[380px] animate-pulse rounded-[4px] bg-muted/20" />
          <div className="mt-4 h-10 w-[620px] animate-pulse rounded-[4px] bg-muted/20" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-[1180px]">
        {/* Page header */}
        <div className="mb-6 flex items-start justify-between gap-4 border-b border-[#E2E8F0] pb-5">
          <div>
            <h1 className="font-heading text-[28px] font-bold leading-tight text-[#0F172A]">Pupil Mode</h1>
            <p className="mt-1 text-sm text-muted">Bulk entry and relationship dynamics.</p>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button
              className="rounded-md border border-[#E2E8F0] bg-surface px-3.5 py-2 text-sm font-medium text-[#475569] hover:bg-[#F1F5F9] disabled:opacity-60"
              onClick={() => navigate(`/configure/${projectId}`)}
              disabled={saveState === "saving" || optimizerLoading}
            >
              Edit Constraints
            </button>
          </div>
        </div>

        {saveState !== "idle" && <WorkflowStatusHeader state={saveState} />}

        {optimizerDiagnostics && (
          <div className="mt-6 rounded-[4px] border border-red-500/60 bg-red-50 p-4 text-red-900">
            <div className="font-heading text-sm font-bold">Optimizer constraints need adjustment</div>
            <div className="mt-1 text-sm">
              The current setup cannot produce a valid roster. Review the flagged constraints, adjust them, and run the optimizer again.
            </div>
            <ul className="mt-3 space-y-3 text-sm">
              {optimizerDiagnostics.violations.map((violation, index) => (
                <li key={`${violation.category}-${index}`} className="rounded-[4px] border border-red-200 bg-white/70 p-3">
                  <div className="font-heading font-bold">{violation.category}</div>
                  <div className="mt-1">{violation.message}</div>
                  <div className="mt-1 text-red-800">Suggestion: {violation.suggestion}</div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Roster section */}
        <section className="rounded-lg border border-[#E2E8F0] bg-surface shadow-sm">
          {/* Section header */}
          <div className="flex items-center justify-between gap-4 border-b border-[#E2E8F0] px-5 py-4">
            <div>
              <div className="font-heading text-sm font-bold text-[#0F172A]">Students</div>
              <div className="mt-0.5 font-mono text-xs text-muted">
                {pupils.length} {pupils.length === 1 ? "pupil" : "pupils"} · {positiveCount} positive link{positiveCount !== 1 ? "s" : ""} · {negativeCount} negative block{negativeCount !== 1 ? "s" : ""}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex h-9 cursor-pointer items-center rounded-md border border-[#CBD5E1] bg-surface px-3.5 text-sm font-medium text-[#334155] hover:bg-[#F8FAFC] disabled:opacity-60">
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
                  disabled={saveState === "saving" || optimizerLoading}
                />
              </label>

              <button
                className="h-9 rounded-md border border-[#CBD5E1] bg-surface px-3.5 text-sm font-medium text-[#334155] hover:bg-[#F8FAFC] disabled:opacity-60"
                onClick={addBlankRow}
                disabled={saveState === "saving" || optimizerLoading}
              >
                Add Row
              </button>
            </div>
          </div>

          {pupils.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#F1F5F9]">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="8" r="4" />
                  <path d="M2 20c0-4 3.13-7 7-7h4c3.87 0 7 3 7 7" />
                  <path d="M16 3v6M13 6h6" />
                </svg>
              </div>
              <div className="font-heading font-semibold text-[#0F172A]">Upload CSV or add row manually</div>
              <div className="mt-1.5 text-sm text-muted">We’ll parse your CSV and generate classes.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] text-left">
                    <th className="border-b border-[#E2E8F0] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Student Name</th>
                    <th className="border-b border-[#E2E8F0] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Origin School</th>
                    <th className="border-b border-[#E2E8F0] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Gender</th>
                    <th className="border-b border-[#E2E8F0] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Needs</th>
                    <th className="border-b border-[#E2E8F0] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Location / Zone</th>
                    <th className="border-b border-[#E2E8F0] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Chemistry</th>
                  </tr>
                </thead>
                <tbody>
                  {pupils.map((pupil, index) => (
                    <tr key={pupil.id} className={index % 2 === 0 ? "bg-white" : "bg-[#F8FAFC]/60"}>
                      <td className="border-b border-[#E2E8F0] px-4 py-2">
                        <input
                          className={`w-full rounded-md border border-[#CBD5E1] bg-transparent px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent ${isCellInvalid(pupil.id, "name") ? CELL_ERROR_CLASS : ""}`}
                          value={pupil.name}
                          onChange={(event) => updatePupil(pupil.id, { name: event.target.value })}
                          onBlur={() => touchField(pupil.id, "name")}
                          placeholder="Name"
                          disabled={saveState === "saving" || optimizerLoading}
                        />
                      </td>
                      <td className="border-b border-[#E2E8F0] px-4 py-2">
                        <input
                          className={`w-full rounded-md border border-[#CBD5E1] bg-transparent px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent ${isCellInvalid(pupil.id, "originSchool") ? CELL_ERROR_CLASS : ""}`}
                          value={pupil.originSchool}
                          onChange={(event) => updatePupil(pupil.id, { originSchool: event.target.value })}
                          onBlur={() => touchField(pupil.id, "originSchool")}
                          placeholder="e.g. Oakridge Elem."
                          disabled={saveState === "saving" || optimizerLoading}
                        />
                      </td>
                      <td className="border-b border-[#E2E8F0] px-4 py-2">
                        <select
                          className="w-full rounded-md border border-[#CBD5E1] bg-transparent px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
                          value={pupil.gender}
                          onChange={(event) => updatePupil(pupil.id, { gender: event.target.value as Pupil["gender"] })}
                          disabled={saveState === "saving" || optimizerLoading}
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </td>
                      <td className="border-b border-[#E2E8F0] px-4 py-2">
                        <input
                          className={`w-full rounded-md border border-[#CBD5E1] bg-transparent px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent ${isCellInvalid(pupil.id, "needs") ? CELL_ERROR_CLASS : ""}`}
                          value={pupil.needs}
                          onChange={(event) => updatePupil(pupil.id, { needs: event.target.value })}
                          onBlur={() => touchField(pupil.id, "needs")}
                          placeholder="e.g. Reading support"
                          disabled={saveState === "saving" || optimizerLoading}
                        />
                      </td>
                      <td className="border-b border-[#E2E8F0] px-4 py-2">
                        <input
                          className={`w-full rounded-md border border-[#CBD5E1] bg-transparent px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent ${isCellInvalid(pupil.id, "zone") ? CELL_ERROR_CLASS : ""}`}
                          value={pupil.zone}
                          onChange={(event) => updatePupil(pupil.id, { zone: event.target.value })}
                          onBlur={() => touchField(pupil.id, "zone")}
                          placeholder="e.g. Zone A"
                          disabled={saveState === "saving" || optimizerLoading}
                        />
                      </td>
                      <td className="border-b border-[#E2E8F0] px-4 py-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-green-200 bg-green-50 text-sm font-bold text-green-700 hover:bg-green-100 disabled:opacity-50"
                            onClick={() => {
                              setChemSearch("");
                              setChemModalFor({ pupilId: pupil.id, kind: "positive" });
                            }}
                            disabled={saveState === "saving" || optimizerLoading}
                            title="Positive chemistry (+)"
                          >
                            +
                          </button>
                          <button
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-red-200 bg-red-50 text-sm font-bold text-red-600 hover:bg-red-100 disabled:opacity-50"
                            onClick={() => {
                              setChemSearch("");
                              setChemModalFor({ pupilId: pupil.id, kind: "negative" });
                            }}
                            disabled={saveState === "saving" || optimizerLoading}
                            title="Negative chemistry / do-not-match (-)"
                          >
                            -
                          </button>
                        </div>
                        <div className="mt-1.5 font-mono text-xs text-muted">
                          +{chemistry.positive.filter(([fromId]) => fromId === pupil.id).length} / -{chemistry.negative.filter(([fromId]) => fromId === pupil.id).length}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-5 pb-2">
            <IssuesPanel
              errors={issues.errors}
              warnings={issues.warnings}
              failedImports={failedImports}
            />
          </div>

          <div className="px-5">
            <ChemistryStatCards chemistry={chemistry} totalPupils={pupils.length} />
          </div>

          {/* Action footer */}
          <div className="flex items-center justify-end gap-3 border-t border-[#E2E8F0] px-5 py-4">
            {saveState === "error" && (
              <button
                className="h-9 rounded-md border border-[#CBD5E1] bg-surface px-4 text-sm font-medium text-[#334155] hover:bg-[#F8FAFC]"
                onClick={retrySave}
              >
                Retry save
              </button>
            )}
            <button
              className="h-10 rounded-md bg-accent px-6 text-sm font-heading font-bold text-surface disabled:cursor-not-allowed disabled:opacity-60"
              onClick={runOptimizer}
              disabled={optimizerDisabled}
            >
              {optimizerLoading ? "Running Optimizer..." : "Run Optimizer"}
            </button>
          </div>
        </section>

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
