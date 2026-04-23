type Props = {
  className?: string;
  color?: string;
};

export function Ornament({ className, color = "var(--gold)" }: Props) {
  return (
    <div
      className={`text-center leading-none select-none ${className ?? ""}`}
      aria-hidden
    >
      <svg width="140" height="14" viewBox="0 0 140 14" className="inline-block">
        <line x1="0" y1="7" x2="60" y2="7" stroke={color} strokeWidth="0.75" />
        <polygon points="70,2 75,7 70,12 65,7" fill={color} />
        <line x1="80" y1="7" x2="140" y2="7" stroke={color} strokeWidth="0.75" />
      </svg>
    </div>
  );
}
