import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import { DndContext, type DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";

import type { Chemistry, OptimizationConstraints, OptimizeResponse, Pupil, Score } from "../lib/api";
import { useEditorStore, useEditorTemporalStore, readEditorDraft } from "../lib/editorStore";
import { supabase } from "../lib/supabase";

type ConstraintsRow = {
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

type PupilsDbRow = {
  id: string;
  project_id: string;
  name: string;
  gender: Pupil["gender"];
  origin_school: string;
  needs: string;
  zone: string;
};

type RosterAssignmentRow = {
  assignment: string[][];
  score_json: Score | null;
  updated_at: string;
};

const DEFAULT_CONSTRAINTS: OptimizationConstraints = {
  minClassSize: 20,
  maxClassSize: 25,
  genderPriority: "flexible",
  originPriority: "best_effort",
  locationPriority: "ignore",
  needsPriority: "flexible"
};

function scoreDistribution({
  pupilsById,
  classes,
  groupKey
}: {
  pupilsById: Map<string, Pupil>;
  classes: string[][];
  groupKey: (p: Pupil) => string;
}) {
  const classCount = classes.length;
  if (classCount === 0) {
    return 1;
  }

  const totals = new Map<string, number>();
  for (const pupil of pupilsById.values()) {
    totals.set(groupKey(pupil), (totals.get(groupKey(pupil)) ?? 0) + 1);
  }

  let penalty = 0;
  let totalChecks = 0;

  for (const [group, total] of totals) {
    const ideal = total / classCount;
    for (const groupClass of classes) {
      const count = groupClass.filter((pupilId) => groupKey(pupilsById.get(pupilId) as Pupil) === group).length;
      penalty += Math.abs(count - ideal);
      totalChecks += 1;
    }
  }

  const maxPenalty = Math.max(
    1,
    totalChecks * (Math.max(1, Math.max(...Array.from(totals.values(), (value) => value))) / classCount)
  );

  return 1 - Math.min(1, penalty / maxPenalty);
}

function buildNegativeSet(chemistry: Chemistry) {
  const set = new Set<string>();
  for (const [a, b] of chemistry.negative) {
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    set.add(key);
  }
  return set;
}

function computeQuickScore({
  pupilsById,
  classes,
  constraints,
  chemistry
}: {
  pupilsById: Map<string, Pupil>;
  classes: string[][];
  constraints: OptimizationConstraints;
  chemistry: Chemistry;
}): Score {
  const classOf = new Map<string, number>();
  classes.forEach((groupClass, index) => groupClass.forEach((pupilId) => classOf.set(pupilId, index)));

  let positiveTogether = chemistry.positive.length === 0 ? 1 : 0;
  const positiveTotal = Math.max(1, chemistry.positive.length);
  for (const [a, b] of chemistry.positive) {
    if (classOf.get(a) !== undefined && classOf.get(a) === classOf.get(b)) {
      positiveTogether += 1;
    }
  }

  const chemistryScore = positiveTogether / positiveTotal;
  const genderScore =
    constraints.genderPriority === "ignore"
      ? 1
      : scoreDistribution({ pupilsById, classes, groupKey: (pupil) => pupil.gender });
  const originScore =
    constraints.originPriority === "ignore"
      ? 1
      : scoreDistribution({ pupilsById, classes, groupKey: (pupil) => pupil.originSchool });
  const needsScore =
    constraints.needsPriority === "strict" || constraints.needsPriority === "flexible"
      ? scoreDistribution({ pupilsById, classes, groupKey: (pupil) => pupil.needs })
      : 1;
  const locationScore =
    constraints.locationPriority === "ignore" || constraints.locationPriority === "not_considered"
      ? 1
      : scoreDistribution({ pupilsById, classes, groupKey: (pupil) => pupil.zone });

  const overall =
    genderScore * 0.2 + originScore * 0.25 + needsScore * 0.2 + locationScore * 0.15 + chemistryScore * 0.2;

  return {
    overall: Math.max(0, Math.min(1, overall)),
    genderBalance: genderScore,
    originMix: originScore,
    needsBalance: needsScore,
    locationBalance: locationScore,
    chemistry: chemistryScore
  };
}

function mapPupilRow(row: PupilsDbRow): Pupil {
  return {
    id: row.id,
    name: row.name,
    gender: row.gender,
    originSchool: row.origin_school,
    needs: row.needs,
    zone: row.zone
  };
}

function mapChemistryRows(rows: ChemistryRow[]): Chemistry {
  return {
    positive: rows.filter((row) => row.relationship === "positive").map((row) => [row.from_pupil_id, row.to_pupil_id]),
    negative: rows.filter((row) => row.relationship === "negative").map((row) => [row.from_pupil_id, row.to_pupil_id])
  };
}

function getOptimizerAssignment(run: OptimizeResponse | null) {
  return run?.classes.map((groupClass) => groupClass.pupilIds) ?? [];
}

function parseSavedTimestamp(value: string | null | undefined) {
  if (!value) {
    return 0;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function ClassColumn({
  classIndex,
  pupilIds,
  pupilsById,
  onPupilClick
}: {
  classIndex: number;
  pupilIds: string[];
  pupilsById: Map<string, Pupil>;
  onPupilClick?: (pupilId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `class-${classIndex}`
  });

  return (
    <div
      ref={setNodeRef}
      className={[
        "w-[320px] min-w-[320px] rounded-[4px] border border-muted/50 bg-background/30 p-3",
        isOver ? "outline outline-2 outline-accent" : ""
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="font-heading text-sm font-bold text-primary">Class {classIndex + 1}</div>
        <div className="font-mono text-xs text-muted">{pupilIds.length}/{pupilIds.length}</div>
      </div>
      <div className="mt-3 min-h-[280px] space-y-2">
        {pupilIds.map((pupilId) => (
          <DraggablePupilCard
            key={pupilId}
            pupil={
              pupilsById.get(pupilId) ?? {
                id: pupilId,
                name: pupilId,
                gender: "Other",
                originSchool: "",
                needs: "",
                zone: ""
              }
            }
            onClick={() => onPupilClick?.(pupilId)}
          />
        ))}
      </div>
    </div>
  );
}

function DraggablePupilCard({ pupil, onClick }: { pupil: Pupil; onClick?: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: pupil.id,
    data: { type: "pupil", pupilId: pupil.id }
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined }}
      className={[
        "cursor-grab select-none rounded-[4px] border border-muted/50 bg-surface p-2 active:cursor-grabbing",
        isDragging ? "opacity-80" : ""
      ].join(" ")}
      {...attributes}
      {...listeners}
      onClick={onClick}
    >
      <div className="truncate text-sm font-heading font-bold text-primary">{pupil.name}</div>
      <div className="font-mono text-xs text-muted">drag</div>
    </div>
  );
}

export default function ClassEditor() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const assignment = useEditorStore((state) => state.assignment);
  const initialize = useEditorStore((state) => state.initialize);
  const setAssignment = useEditorStore((state) => state.setAssignment);
  const { undo, redo, canUndo, canRedo } = useEditorTemporalStore((state) => ({
    undo: state.undo,
    redo: state.redo,
    canUndo: state.pastStates.length > 0,
    canRedo: state.futureStates.length > 0
  }));

  const [loading, setLoading] = useState(true);
  const [constraints, setConstraints] = useState<OptimizationConstraints>(DEFAULT_CONSTRAINTS);
  const [pupilsById, setPupilsById] = useState<Map<string, Pupil>>(new Map());
  const [chemistry, setChemistry] = useState<Chemistry>({ positive: [], negative: [] });
  const [negativeSet, setNegativeSet] = useState<Set<string>>(new Set());
  const [optimizerAssignment, setOptimizerAssignment] = useState<string[][]>([]);
  const [score, setScore] = useState<Score | null>(null);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!projectId) {
        return;
      }

      setLoading(true);

      const [constraintsResult, pupilsResult, chemistryResult, savedAssignmentResult, runResult] = await Promise.all([
        supabase.from("project_constraints").select("*").eq("project_id", projectId).maybeSingle<ConstraintsRow>(),
        supabase.from("pupils").select("id,name,gender,origin_school,needs,zone,project_id").eq("project_id", projectId),
        supabase.from("chemistry_links").select("from_pupil_id,to_pupil_id,relationship").eq("project_id", projectId),
        supabase
          .from("roster_assignments")
          .select("assignment,score_json,updated_at")
          .eq("project_id", projectId)
          .maybeSingle<RosterAssignmentRow>(),
        supabase
          .from("optimization_runs")
          .select("result_json")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle<{ result_json: OptimizeResponse }>()
      ]);

      if (!mounted) {
        return;
      }

      const nextConstraints: OptimizationConstraints = constraintsResult.data
        ? {
            minClassSize: constraintsResult.data.min_class_size,
            maxClassSize: constraintsResult.data.max_class_size,
            genderPriority: constraintsResult.data.gender_priority,
            originPriority: constraintsResult.data.origin_priority,
            locationPriority: constraintsResult.data.location_priority,
            needsPriority: constraintsResult.data.needs_priority
          }
        : DEFAULT_CONSTRAINTS;

      if (constraintsResult.error) {
        toast.error("Failed to load constraints. Using defaults.");
      }

      const mappedPupils = new Map<string, Pupil>();
      ((pupilsResult.data ?? []) as PupilsDbRow[]).forEach((row) => {
        mappedPupils.set(row.id, mapPupilRow(row));
      });
      if (pupilsResult.error) {
        toast.error("Failed to load pupils.");
      }

      const nextChemistry = mapChemistryRows((chemistryResult.data ?? []) as ChemistryRow[]);
      if (chemistryResult.error) {
        toast.error("Failed to load chemistry links.");
      }

      const optimizerRun = runResult.data?.result_json ?? null;
      const optimizerBaseline = getOptimizerAssignment(optimizerRun);
      const savedAssignment = savedAssignmentResult.data?.assignment ?? null;
      const savedTimestamp = parseSavedTimestamp(savedAssignmentResult.data?.updated_at);
      const localDraft = readEditorDraft(projectId);
      const localTimestamp = localDraft?.timestamp ?? 0;

      let nextAssignment = optimizerBaseline;
      let nextScore =
        optimizerBaseline.length > 0
          ? computeQuickScore({
              pupilsById: mappedPupils,
              classes: optimizerBaseline,
              constraints: nextConstraints,
              chemistry: nextChemistry
            })
          : null;
      let nextLastSaved: string | null = null;
      let nextTimestamp = localTimestamp || Date.now();

      if (localDraft && (savedTimestamp === 0 || localTimestamp > savedTimestamp)) {
        nextAssignment = localDraft.assignment;
        nextScore = computeQuickScore({
          pupilsById: mappedPupils,
          classes: localDraft.assignment,
          constraints: nextConstraints,
          chemistry: nextChemistry
        });
        nextLastSaved = localDraft.lastSaved;
        nextTimestamp = localDraft.timestamp;
      } else if (savedAssignment && savedAssignment.length > 0) {
        nextAssignment = savedAssignment;
        nextScore =
          savedAssignmentResult.data?.score_json ??
          computeQuickScore({
            pupilsById: mappedPupils,
            classes: savedAssignment,
            constraints: nextConstraints,
            chemistry: nextChemistry
          });
        nextLastSaved = savedAssignmentResult.data?.updated_at ?? null;
        nextTimestamp = savedTimestamp || Date.now();
      } else if (optimizerBaseline.length === 0) {
        toast.error("No results found.");
        nextAssignment = [];
        nextScore = null;
        nextTimestamp = Date.now();
      }

      setConstraints(nextConstraints);
      setPupilsById(mappedPupils);
      setChemistry(nextChemistry);
      setNegativeSet(buildNegativeSet(nextChemistry));
      setOptimizerAssignment(optimizerBaseline);
      initialize(projectId, nextAssignment, { lastSaved: nextLastSaved, timestamp: nextTimestamp });
      setScore(nextScore);
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [initialize, projectId]);

  const hasOptimizerBaseline = optimizerAssignment.length > 0;

  useEffect(() => {
    if (loading || assignment.length === 0) {
      return;
    }

    setScore(
      computeQuickScore({
        pupilsById,
        classes: assignment,
        constraints,
        chemistry
      })
    );
  }, [assignment, chemistry, constraints, loading, pupilsById]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const modifierPressed = event.metaKey || event.ctrlKey;
      if (!modifierPressed || event.key.toLowerCase() !== "z") {
        return;
      }

      if (event.shiftKey) {
        if (!canRedo) {
          return;
        }
        event.preventDefault();
        redo();
        return;
      }

      if (!canUndo) {
        return;
      }
      event.preventDefault();
      undo();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canRedo, canUndo, redo, undo]);

  function isNegativePair(pupilIdA: string, pupilIdB: string) {
    const key = pupilIdA < pupilIdB ? `${pupilIdA}|${pupilIdB}` : `${pupilIdB}|${pupilIdA}`;
    return negativeSet.has(key);
  }

  function getClassIndexOfPupil(pupilId: string) {
    return assignment.findIndex((groupClass) => groupClass.includes(pupilId));
  }

  function recalc(nextAssignment: string[][]) {
    setAssignment(nextAssignment);
  }

  function checkDropConflict(targetClassIndex: number, pupilId: string) {
    const targetPupils = assignment[targetClassIndex] ?? [];
    for (const otherPupilId of targetPupils) {
      if (isNegativePair(pupilId, otherPupilId)) {
        return otherPupilId;
      }
    }
    return null;
  }

  function onDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id);
    if (!event.over) {
      return;
    }

    const overId = String(event.over.id);
    if (!overId.startsWith("class-")) {
      return;
    }

    const targetClassIndex = Number(overId.replace("class-", ""));
    const sourceClassIndex = getClassIndexOfPupil(activeId);
    if (sourceClassIndex === -1 || sourceClassIndex === targetClassIndex) {
      return;
    }

    const conflictWith = checkDropConflict(targetClassIndex, activeId);
    if (conflictWith) {
      toast.error(`Conflict: ${activeId} cannot be in the same class as ${conflictWith} (-).`);
      return;
    }

    const nextAssignment = assignment.map((groupClass) => [...groupClass]);
    nextAssignment[sourceClassIndex] = nextAssignment[sourceClassIndex].filter((pupilId) => pupilId !== activeId);
    nextAssignment[targetClassIndex].push(activeId);
    recalc(nextAssignment);
  }

  async function resetToOptimizerResult() {
    if (!projectId || !hasOptimizerBaseline) {
      return;
    }

    setResetting(true);

    const { error } = await supabase.from("roster_assignments").delete().eq("project_id", projectId);
    if (error) {
      toast.error("Failed to reset manual assignments.");
      setResetting(false);
      return;
    }

    initialize(projectId, optimizerAssignment, { lastSaved: null, timestamp: Date.now() });
    setScore(
      computeQuickScore({
        pupilsById,
        classes: optimizerAssignment,
        constraints,
        chemistry
      })
    );
    toast.success("Restored optimizer assignment.");
    setResetting(false);
  }

  const headerMeta = useMemo(() => {
    const savedCount = assignment.reduce((total, groupClass) => total + groupClass.length, 0);
    return `${assignment.length} classes · ${savedCount} pupils`;
  }, [assignment]);

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
            <h1 className="font-heading text-[30px] font-bold text-primary">Class Editor</h1>
            <p className="mt-1 text-sm text-muted">
              Drag-and-drop with persistent session drafts and durable saved assignments.
            </p>
            <div className="mt-2 font-mono text-xs text-muted">{headerMeta}</div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-[4px] border border-muted bg-surface px-4 py-2 text-sm font-heading font-bold text-primary hover:bg-background/70 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => undo()}
              disabled={!canUndo}
            >
              Undo
            </button>
            <button
              type="button"
              className="rounded-[4px] border border-muted bg-surface px-4 py-2 text-sm font-heading font-bold text-primary hover:bg-background/70 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => redo()}
              disabled={!canRedo}
            >
              Redo
            </button>
            <button
              type="button"
              className="rounded-[4px] border border-muted bg-surface px-4 py-2 text-sm font-heading font-bold text-primary hover:bg-background/70 disabled:opacity-60"
              onClick={resetToOptimizerResult}
              disabled={!hasOptimizerBaseline || resetting}
            >
              {resetting ? "Resetting..." : "Reset to Optimizer Result"}
            </button>
            <button type="button" className="font-heading text-sm text-accent hover:underline" onClick={() => navigate(`/results/${projectId}`)}>
              Back to Results
            </button>
          </div>
        </div>

        <div className="sticky top-6 mt-6 rounded-[4px] border border-muted/50 bg-surface p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-heading font-bold text-primary">Global Score</div>
              <div className="mt-1 font-mono text-xs text-muted">MVP: Quick heuristic score</div>
            </div>
            <div className="text-[26px] font-heading font-bold text-primary">{score ? Math.round(score.overall * 100) : 0}%</div>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <DndContext onDragEnd={onDragEnd}>
            <div className="flex gap-4">
              {assignment.map((groupClass, classIndex) => (
                <ClassColumn key={classIndex} classIndex={classIndex} pupilIds={groupClass} pupilsById={pupilsById} />
              ))}
            </div>
          </DndContext>
        </div>
      </div>
    </div>
  );
}
