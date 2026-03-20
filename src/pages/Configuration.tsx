import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { WorkflowStatusHeader } from "../components/project/WorkflowStatusHeader";
import {
  DEFAULT_CONSTRAINTS,
  type ConstraintFormState,
  type WorkflowSaveState,
  loadProjectConstraints,
  readConfigurationCache,
  saveProjectConstraints,
  validateConstraintForm,
  writeConfigurationCache
} from "../lib/projectWorkflow";

function RadioOption<T extends string>({
  groupLabel,
  label,
  value,
  checked,
  onChange
}: {
  groupLabel: string;
  label: string;
  value: T;
  checked: boolean;
  onChange: (v: T) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
      <input
        type="radio"
        checked={checked}
        onChange={() => onChange(value)}
        className="accent-accent"
        aria-label={`${groupLabel}: ${label}`}
      />
      <span>{label}</span>
    </label>
  );
}

export default function Configuration() {
  const navigate = useNavigate();
  const { projectId } = useParams();

  const [form, setForm] = useState<ConstraintFormState>(() =>
    projectId ? readConfigurationCache(projectId) ?? DEFAULT_CONSTRAINTS : DEFAULT_CONSTRAINTS
  );
  const [saveState, setSaveState] = useState<WorkflowSaveState>("idle");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const validationErrors = useMemo(() => validateConstraintForm(projectId, form), [form, projectId]);
  const hasBlockingValidationError = validationErrors.length > 0;

  useEffect(() => {
    if (!projectId) {
      setSaveState("blocked");
      return;
    }

    const cached = readConfigurationCache(projectId);
    if (cached) {
      setForm(cached);
    } else {
      setForm(DEFAULT_CONSTRAINTS);
    }

    let active = true;

    async function restoreConstraints() {
      setLoadError(null);
      setSaveState("loading");

      try {
        const restoredForm = await loadProjectConstraints(projectId);
        if (!active) {
          return;
        }

        const nextForm =
          restoredForm === DEFAULT_CONSTRAINTS && cached ? cached : restoredForm;

        setForm(nextForm);
        writeConfigurationCache(projectId, nextForm);
        setSaveState(validateConstraintForm(projectId, nextForm).length > 0 ? "blocked" : "saved");
      } catch (error) {
        if (!active) {
          return;
        }

        setLoadError(error instanceof Error ? error.message : "Failed to load saved setup.");
        setSaveState("idle");
      }
    }

    void restoreConstraints();

    return () => {
      active = false;
    };
  }, [projectId, reloadToken]);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    writeConfigurationCache(projectId, form);
  }, [form, projectId]);

  function updateForm(nextForm: ConstraintFormState) {
    setForm(nextForm);

    if (saveState === "saved" || saveState === "error") {
      setSaveState("idle");
    }
  }

  async function saveAndNext() {
    const errors = validateConstraintForm(projectId, form);
    if (errors.length > 0) {
      toast.error(errors[0] ?? "Please fix validation errors.");
      setSaveState("blocked");
      return;
    }

    if (!projectId) {
      return;
    }

    setSaveState("saving");

    try {
      await saveProjectConstraints(projectId, form);
      writeConfigurationCache(projectId, form);
      setSaveState("saved");
      navigate(`/pupils/${projectId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save constraints.");
      setSaveState("error");
    }
  }

  function retryLoad() {
    setReloadToken((value) => value + 1);
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-[1180px]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-heading font-bold text-[30px] text-primary">Configuration Mode</h1>
            <p className="text-muted text-sm mt-1">Define constraints and balancing weights.</p>
          </div>
          <button
            className="text-accent text-sm hover:underline font-heading"
            onClick={() => navigate("/")}
          >
            Back to Welcome
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
          <div className="lg:sticky lg:top-6">
            <div className="border border-muted/50 rounded-[4px] p-4 bg-surface">
              <div className="font-heading font-bold text-primary text-sm">Optimization Engine</div>
              <div className="mt-3 space-y-2">
                <div className="text-xs text-muted">1. Setup</div>
                <div className="text-xs text-muted">2. Configuration</div>
                <div className="text-xs text-muted">3. Pupil Data</div>
                <div className="text-xs text-muted">4. Results</div>
              </div>
            </div>
          </div>

          <div>
            {saveState === "loading" && <WorkflowStatusHeader state="loading" />}
            {saveState === "saving" && <WorkflowStatusHeader state="saving" />}
            {saveState === "saved" && <WorkflowStatusHeader state="saved" />}
            {saveState === "error" && <WorkflowStatusHeader state="error" />}
            {saveState === "blocked" && <WorkflowStatusHeader state="blocked" />}

            {loadError ? (
              <div className="rounded-[4px] border border-red-200 bg-red-50 p-5">
                <div className="font-heading font-bold text-sm text-red-700">
                  Failed to load saved setup.
                </div>
                <p className="mt-2 text-sm text-red-700">{loadError}</p>
                <button
                  className="mt-4 h-11 px-4 rounded-[4px] border border-red-700 text-red-700 hover:bg-red-100 font-heading font-bold text-sm"
                  onClick={retryLoad}
                >
                  Retry loading saved setup
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-5">
                  <div className="border border-muted/50 bg-surface rounded-[4px] p-4">
                    <div className="font-heading font-bold text-sm text-primary">
                      Class Size Limits
                    </div>
                    <div className="mt-2 space-y-4">
                      <div>
                        <div className="flex items-center justify-between text-xs text-muted font-mono">
                          <span>Min: {form.minClassSize}</span>
                          <span>1</span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={35}
                          value={form.minClassSize}
                          onChange={(e) =>
                            updateForm({
                              ...form,
                              minClassSize: Number(e.target.value)
                            })
                          }
                          className="w-full accent-accent"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-xs text-muted font-mono">
                          <span>Max: {form.maxClassSize}</span>
                          <span>35</span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={35}
                          value={form.maxClassSize}
                          onChange={(e) =>
                            updateForm({
                              ...form,
                              maxClassSize: Number(e.target.value)
                            })
                          }
                          className="w-full accent-accent"
                        />
                      </div>
                      {hasBlockingValidationError && (
                        <div className="text-sm text-red-600 font-heading">
                          {validationErrors[0]}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border border-muted/50 bg-surface rounded-[4px] p-4">
                    <div className="font-heading font-bold text-sm text-primary">Gender Balance</div>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <RadioOption
                        groupLabel="Gender Balance"
                        label="Strict (exactly equal)"
                        value="strict"
                        checked={form.genderPriority === "strict"}
                        onChange={(value) => updateForm({ ...form, genderPriority: value })}
                      />
                      <RadioOption
                        groupLabel="Gender Balance"
                        label="Flexible (10% variance)"
                        value="flexible"
                        checked={form.genderPriority === "flexible"}
                        onChange={(value) => updateForm({ ...form, genderPriority: value })}
                      />
                      <RadioOption
                        groupLabel="Gender Balance"
                        label="Ignore"
                        value="ignore"
                        checked={form.genderPriority === "ignore"}
                        onChange={(value) => updateForm({ ...form, genderPriority: value })}
                      />
                    </div>
                  </div>

                  <div className="border border-muted/50 bg-surface rounded-[4px] p-4">
                    <div className="font-heading font-bold text-sm text-primary">
                      Origin School Mix
                    </div>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
                      <RadioOption
                        groupLabel="Origin School Mix"
                        label="Strict"
                        value="strict"
                        checked={form.originPriority === "strict"}
                        onChange={(value) => updateForm({ ...form, originPriority: value })}
                      />
                      <RadioOption
                        groupLabel="Origin School Mix"
                        label="Flexible"
                        value="flexible"
                        checked={form.originPriority === "flexible"}
                        onChange={(value) => updateForm({ ...form, originPriority: value })}
                      />
                      <RadioOption
                        groupLabel="Origin School Mix"
                        label="Best effort distribution"
                        value="best_effort"
                        checked={form.originPriority === "best_effort"}
                        onChange={(value) => updateForm({ ...form, originPriority: value })}
                      />
                      <RadioOption
                        groupLabel="Origin School Mix"
                        label="Ignore"
                        value="ignore"
                        checked={form.originPriority === "ignore"}
                        onChange={(value) => updateForm({ ...form, originPriority: value })}
                      />
                    </div>
                  </div>

                  <div className="border border-muted/50 bg-surface rounded-[4px] p-4">
                    <div className="font-heading font-bold text-sm text-primary">
                      Location / Zone Constraints
                    </div>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
                      <RadioOption
                        groupLabel="Location / Zone Constraints"
                        label="Strict"
                        value="strict"
                        checked={form.locationPriority === "strict"}
                        onChange={(value) => updateForm({ ...form, locationPriority: value })}
                      />
                      <RadioOption
                        groupLabel="Location / Zone Constraints"
                        label="Flexible"
                        value="flexible"
                        checked={form.locationPriority === "flexible"}
                        onChange={(value) => updateForm({ ...form, locationPriority: value })}
                      />
                      <RadioOption
                        groupLabel="Location / Zone Constraints"
                        label="Ignore"
                        value="ignore"
                        checked={form.locationPriority === "ignore"}
                        onChange={(value) => updateForm({ ...form, locationPriority: value })}
                      />
                      <RadioOption
                        groupLabel="Location / Zone Constraints"
                        label="Not considered"
                        value="not_considered"
                        checked={form.locationPriority === "not_considered"}
                        onChange={(value) => updateForm({ ...form, locationPriority: value })}
                      />
                    </div>
                    {form.locationPriority !== "not_considered" && (
                      <div className="mt-2 text-xs text-muted">Zone values come from pupil entry.</div>
                    )}
                  </div>

                  <div className="border border-muted/50 bg-surface rounded-[4px] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-heading font-bold text-sm text-primary">
                        Academic Needs Distribution
                      </div>
                      {form.needsPriority === "strict" && form.maxClassSize < 20 && (
                        <div className="text-red-600 text-xs font-heading">
                          warning: max must be at least 20
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex gap-6">
                      <RadioOption
                        groupLabel="Academic Needs Distribution"
                        label="Strict"
                        value="strict"
                        checked={form.needsPriority === "strict"}
                        onChange={(value) => updateForm({ ...form, needsPriority: value })}
                      />
                      <RadioOption
                        groupLabel="Academic Needs Distribution"
                        label="Flexible"
                        value="flexible"
                        checked={form.needsPriority === "flexible"}
                        onChange={(value) => updateForm({ ...form, needsPriority: value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex items-center justify-end gap-3">
                  {saveState === "error" && (
                    <button
                      className="h-11 px-4 rounded-[4px] border border-muted bg-surface text-primary hover:bg-background font-heading font-bold text-sm"
                      onClick={saveAndNext}
                    >
                      Retry save
                    </button>
                  )}
                  <button
                    className="h-11 px-5 rounded-[4px] border border-accent bg-accent text-surface hover:bg-[#1d4ed8] font-heading font-bold text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    onClick={saveAndNext}
                    disabled={saveState === "loading" || saveState === "saving"}
                  >
                    {saveState === "saving" ? "Saving..." : "Next: Pupil Data →"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
