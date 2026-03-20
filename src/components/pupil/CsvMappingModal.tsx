import {
  EXPECTED_PUPIL_FIELDS,
  type ExpectedPupilField,
  type PupilFieldMap
} from "../../lib/pupilWorkflow";

export function CsvMappingModal({
  headers,
  fieldMap,
  onChange,
  onCancel,
  onApply
}: {
  headers: string[];
  fieldMap: Partial<PupilFieldMap>;
  onChange: (field: ExpectedPupilField, header: string) => void;
  onCancel: () => void;
  onApply: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
      <div className="w-full max-w-[640px] rounded-[4px] border border-muted/50 bg-surface p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl font-bold text-primary">Map CSV Columns</h2>
            <p className="mt-1 text-sm text-muted">
              Match each required pupil field to a CSV header before importing.
            </p>
          </div>
          <button className="text-sm text-muted hover:text-primary" onClick={onCancel}>
            Close
          </button>
        </div>

        <div className="mt-5 grid gap-4">
          {EXPECTED_PUPIL_FIELDS.map((field) => (
            <label key={field} className="grid gap-2 text-sm text-primary">
              <span className="font-heading font-bold">{field}</span>
              <select
                aria-label={field}
                className="rounded-[4px] border border-muted/50 bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-accent"
                value={fieldMap[field] ?? ""}
                onChange={(event) => onChange(field, event.target.value)}
              >
                <option value="">Select column</option>
                {headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            className="h-11 rounded-[4px] border border-muted px-4 text-sm font-heading font-bold text-primary hover:bg-background"
            onClick={onCancel}
          >
            Cancel Import
          </button>
          <button
            className="h-11 rounded-[4px] bg-accent px-4 text-sm font-heading font-bold text-surface disabled:opacity-60"
            onClick={onApply}
            disabled={EXPECTED_PUPIL_FIELDS.some((field) => !fieldMap[field])}
          >
            Apply Mapping
          </button>
        </div>
      </div>
    </div>
  );
}
