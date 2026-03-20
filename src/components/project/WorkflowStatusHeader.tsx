import type { WorkflowSaveState } from "../../lib/projectWorkflow";

const STATUS_LABELS: Record<Exclude<WorkflowSaveState, "idle">, string> = {
  loading: "Loading saved setup...",
  saving: "Saving...",
  saved: "All changes saved",
  error: "Save failed",
  blocked: "Unsaved validation errors"
};

export function WorkflowStatusHeader({ state }: { state: WorkflowSaveState }) {
  if (state === "idle") {
    return null;
  }

  return (
    <div
      className="mb-4 rounded-[4px] border border-muted/50 bg-surface px-4 py-3 text-sm font-heading font-bold text-primary"
      role="status"
      aria-live="polite"
    >
      {STATUS_LABELS[state]}
    </div>
  );
}
