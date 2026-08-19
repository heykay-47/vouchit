export type CampaignStage = 'details' | 'inventory' | 'invoice' | 'active';

const stages: CampaignStage[] = ['details', 'inventory', 'invoice', 'active'];

export default function CampaignStages({ stage }: { stage: CampaignStage }) {
  return (
    <ol aria-label="campaign stages" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {stages.map((item) => (
        <li
          key={item}
          aria-label={item}
          aria-current={item === stage ? 'step' : undefined}
          className={`rounded-md border px-3 py-2 text-center text-sm lowercase ${item === stage ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground'}`}
        >
          {item}
        </li>
      ))}
    </ol>
  );
}
