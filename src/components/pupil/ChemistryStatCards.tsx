import type { Chemistry } from "../../lib/api";

type ChemistryStatCardsProps = {
  chemistry: Chemistry;
  totalPupils: number;
};

function LinkedIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M8.24 7.76l1.52 2.48" />
    </svg>
  );
}

function PositiveIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="7" />
      <path d="M9 6v6M6 9h6" />
    </svg>
  );
}

function NegativeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="7" />
      <path d="M6 9h6" />
    </svg>
  );
}

export function ChemistryStatCards({ chemistry, totalPupils }: ChemistryStatCardsProps) {
  const linkedPupilIds = new Set<string>();

  [...chemistry.positive, ...chemistry.negative].forEach(([fromPupilId, toPupilId]) => {
    linkedPupilIds.add(fromPupilId);
    linkedPupilIds.add(toPupilId);
  });

  const stats = [
    {
      label: "Pupils with chemistry links",
      value: Math.min(linkedPupilIds.size, totalPupils),
      icon: <LinkedIcon />,
      iconBg: "bg-accent/10 text-accent"
    },
    {
      label: "Positive pairs",
      value: chemistry.positive.length,
      icon: <PositiveIcon />,
      iconBg: "bg-green-50 text-green-600"
    },
    {
      label: "Negative pairs",
      value: chemistry.negative.length,
      icon: <NegativeIcon />,
      iconBg: "bg-red-50 text-red-500"
    }
  ];

  return (
    <section className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex items-start gap-4 rounded-md border border-[#E2E8F0] bg-surface p-4 shadow-sm"
        >
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${stat.iconBg}`}>
            {stat.icon}
          </div>
          <div className="min-w-0">
            <div className="font-mono text-2xl font-normal leading-none text-[#0F172A]">
              {stat.value}
            </div>
            <div className="mt-1.5 text-xs text-muted">{stat.label}</div>
          </div>
        </div>
      ))}
    </section>
  );
}
