export function JourneyNav({
  labels,
  step,
  onChange,
  enabled,
}: {
  labels: string[];
  step: number;
  onChange: (step: number) => void;
  enabled?: boolean[];
}) {
  return (
    <nav className="journey-nav" aria-label="Property workflow">
      {labels.map((label, index) => (
        <button
          type="button"
          key={label}
          aria-current={step === index ? 'step' : undefined}
          disabled={enabled ? !enabled[index] : false}
          onClick={() => onChange(index)}
        >
          <span>{index + 1}</span>
          {label}
        </button>
      ))}
    </nav>
  );
}
