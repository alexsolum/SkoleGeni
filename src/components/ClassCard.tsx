import type { Chemistry, Pupil } from "../lib/api";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type ResolvedClassPupil = Pupil & {
  missing?: boolean;
};

export type ChemistryStatus = {
  positiveSatisfied: boolean;
  negativeViolation: boolean;
  positiveTargets: string[];
  negativeTargets: string[];
};

export function mapClassPupils(pupilIds: string[], pupilsById: Map<string, Pupil>): ResolvedClassPupil[] {
  return pupilIds.map((pupilId) => {
    const pupil = pupilsById.get(pupilId);
    if (pupil) {
      return pupil;
    }

    return {
      id: pupilId,
      name: `Unknown pupil (${pupilId.slice(0, 8)})`,
      gender: "Other",
      originSchool: "Unknown",
      needs: "",
      zone: "",
      missing: true
    };
  });
}

export function buildGenderDistribution(pupils: ResolvedClassPupil[]) {
  const counts = new Map<string, number>();

  pupils.forEach((pupil) => {
    const label = pupil.gender || "Unknown";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  });

  return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
}

export function buildOriginDistribution(pupils: ResolvedClassPupil[]) {
  const counts = new Map<string, number>();

  pupils.forEach((pupil) => {
    const label = pupil.originSchool?.trim() || "Unknown";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((left, right) => right.value - left.value || left.name.localeCompare(right.name));
}

function buildClassIndexByPupilId(classes: string[][]) {
  const classIndexByPupilId = new Map<string, number>();

  classes.forEach((pupilIds, classIndex) => {
    pupilIds.forEach((pupilId) => {
      classIndexByPupilId.set(pupilId, classIndex);
    });
  });

  return classIndexByPupilId;
}

export function getChemistryStatusByPupil({
  classes,
  chemistry
}: {
  classes: string[][];
  chemistry: Chemistry;
}) {
  const classIndexByPupilId = buildClassIndexByPupilId(classes);
  const statusByPupilId = new Map<string, ChemistryStatus>();

  function ensureStatus(pupilId: string) {
    if (!statusByPupilId.has(pupilId)) {
      statusByPupilId.set(pupilId, {
        positiveSatisfied: false,
        negativeViolation: false,
        positiveTargets: [],
        negativeTargets: []
      });
    }

    return statusByPupilId.get(pupilId)!;
  }

  chemistry.positive.forEach(([fromPupilId, toPupilId]) => {
    const fromClass = classIndexByPupilId.get(fromPupilId);
    const toClass = classIndexByPupilId.get(toPupilId);
    if (fromClass === undefined || toClass === undefined || fromClass !== toClass) {
      return;
    }

    const fromStatus = ensureStatus(fromPupilId);
    const toStatus = ensureStatus(toPupilId);
    fromStatus.positiveSatisfied = true;
    toStatus.positiveSatisfied = true;
    fromStatus.positiveTargets.push(toPupilId);
    toStatus.positiveTargets.push(fromPupilId);
  });

  chemistry.negative.forEach(([fromPupilId, toPupilId]) => {
    const fromClass = classIndexByPupilId.get(fromPupilId);
    const toClass = classIndexByPupilId.get(toPupilId);
    if (fromClass === undefined || toClass === undefined || fromClass !== toClass) {
      return;
    }

    const fromStatus = ensureStatus(fromPupilId);
    const toStatus = ensureStatus(toPupilId);
    fromStatus.negativeViolation = true;
    toStatus.negativeViolation = true;
    fromStatus.negativeTargets.push(toPupilId);
    toStatus.negativeTargets.push(fromPupilId);
  });

  return statusByPupilId;
}

const GENDER_COLORS: Record<string, string> = {
  Male: "#2563EB",
  Female: "#F97316",
  Other: "#0F766E",
  Unknown: "#64748B"
};

function ChemistryBadge({
  tone,
  symbol,
  title
}: {
  tone: "positive" | "negative";
  symbol: string;
  title: string;
}) {
  return (
    <span
      className={[
        "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
        tone === "positive" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
      ].join(" ")}
      title={title}
      aria-label={title}
    >
      {symbol}
    </span>
  );
}

export type ClassCardProps = {
  classIndex: number;
  pupilIds: string[];
  pupilsById: Map<string, Pupil>;
  classes: string[][];
  chemistryLinks: Chemistry;
};

export function ClassCard({
  classIndex,
  pupilIds,
  pupilsById,
  classes,
  chemistryLinks
}: ClassCardProps) {
  const pupils = mapClassPupils(pupilIds, pupilsById);
  const genderData = buildGenderDistribution(pupils);
  const originData = buildOriginDistribution(pupils);
  const chemistryStatusByPupil = getChemistryStatusByPupil({
    classes,
    chemistry: chemistryLinks
  });

  return (
    <section className="min-w-[340px] rounded-[4px] border border-muted/50 bg-background/40 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-lg font-bold text-primary">Class {classIndex + 1}</h2>
          <p className="mt-1 text-xs font-mono text-muted">{pupils.length} pupils</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-right text-xs text-muted">
          <div>{genderData.length} gender groups</div>
          <div>{originData.length} origin groups</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-[4px] border border-muted/40 bg-surface p-3">
          <div className="text-xs font-mono text-muted">Gender</div>
          <div className="mt-3 h-[180px]" data-testid={`gender-chart-${classIndex}`}>
            {genderData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted">No pupil data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genderData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={44}
                    outerRadius={68}
                    paddingAngle={3}
                  >
                    {genderData.map((entry) => (
                      <Cell key={entry.name} fill={GENDER_COLORS[entry.name] ?? "#64748B"} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-[4px] border border-muted/40 bg-surface p-3">
          <div className="text-xs font-mono text-muted">Origin School</div>
          <div className="mt-3 h-[180px]" data-testid={`origin-chart-${classIndex}`}>
            {originData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted">No pupil data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={originData} margin={{ top: 8, right: 8, left: -18, bottom: 28 }}>
                  <XAxis dataKey="name" angle={-20} textAnchor="end" interval={0} height={44} fontSize={11} />
                  <YAxis allowDecimals={false} fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0F172A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-[4px] border border-muted/40 bg-surface p-3">
        <div className="flex items-center justify-between gap-4">
          <div className="text-xs font-mono text-muted">Pupils</div>
          <div className="text-xs text-muted">Scrollable full roster</div>
        </div>

        <div className="mt-3 max-h-[320px] space-y-2 overflow-y-auto pr-1">
          {pupils.length === 0 ? (
            <div className="rounded-[4px] border border-dashed border-muted/40 px-3 py-4 text-sm text-muted">
              No pupils assigned
            </div>
          ) : (
            pupils.map((pupil) => {
              const chemistryStatus = chemistryStatusByPupil.get(pupil.id);
              const positiveNames = chemistryStatus?.positiveTargets.map(
                (targetId) => pupilsById.get(targetId)?.name ?? targetId
              );
              const negativeNames = chemistryStatus?.negativeTargets.map(
                (targetId) => pupilsById.get(targetId)?.name ?? targetId
              );

              return (
                <div
                  key={pupil.id}
                  className="flex items-start justify-between gap-3 rounded-[4px] border border-muted/30 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate font-heading text-sm font-bold text-primary">{pupil.name}</div>
                    <div className="mt-1 text-xs text-muted">
                      {pupil.originSchool || "Unknown origin"} · {pupil.gender}
                      {pupil.missing ? " · Missing source data" : ""}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {chemistryStatus?.positiveSatisfied ? (
                      <ChemistryBadge
                        tone="positive"
                        symbol="♥"
                        title={`Positive chemistry satisfied with ${positiveNames?.join(", ")}`}
                      />
                    ) : null}
                    {chemistryStatus?.negativeViolation ? (
                      <ChemistryBadge
                        tone="negative"
                        symbol="●"
                        title={`Negative chemistry conflict with ${negativeNames?.join(", ")}`}
                      />
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}

export default ClassCard;
