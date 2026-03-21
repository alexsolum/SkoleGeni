import type { Chemistry } from "../../lib/api";

type ChemistryStatCardsProps = {
  chemistry: Chemistry;
  totalPupils: number;
};

export function ChemistryStatCards({ chemistry, totalPupils }: ChemistryStatCardsProps) {
  const linkedPupilIds = new Set<string>();

  [...chemistry.positive, ...chemistry.negative].forEach(([fromPupilId, toPupilId]) => {
    linkedPupilIds.add(fromPupilId);
    linkedPupilIds.add(toPupilId);
  });

  const stats = [
    {
      label: "Pupils with chemistry links",
      value: Math.min(linkedPupilIds.size, totalPupils)
    },
    {
      label: "Positive pairs",
      value: chemistry.positive.length
    },
    {
      label: "Negative pairs",
      value: chemistry.negative.length
    }
  ];

  return (
    <section className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-[4px] border border-[#E2E8F0] bg-surface p-4">
          <div className="font-mono text-2xl font-normal text-[#0F172A]">{stat.value}</div>
          <div className="mt-2 text-xs text-muted">{stat.label}</div>
        </div>
      ))}
    </section>
  );
}
