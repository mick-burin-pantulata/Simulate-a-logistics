import type { CSSProperties, ReactNode } from 'react';

export function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="section">
      <header className="section-head">
        <h3>{title}</h3>
        {aside}
      </header>
      {children}
    </section>
  );
}

export function Stat({ label, value, unit, tone }: { label: string; value: ReactNode; unit?: string; tone?: string }) {
  return (
    <div className="stat" style={tone ? ({ '--tone': tone } as CSSProperties) : undefined}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">
        {value}
        {unit && <small>{unit}</small>}
      </span>
    </div>
  );
}

export function Meter({ value, max = 1, color, label }: { value: number; max?: number; color?: string; label?: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className="meter" aria-label={label}>
      <div className="meter-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className="badge" style={{ '--badge': color } as CSSProperties}>
      <i />
      {label}
    </span>
  );
}

/** Tiny line chart; `series` share the same x axis. */
export function Sparkline({
  series,
  height = 56,
}: {
  series: { values: number[]; color: string; max?: number }[];
  height?: number;
}) {
  const W = 260;
  const n = Math.max(...series.map((s) => s.values.length));
  if (n < 2) return <div className="spark-empty">กำลังเก็บข้อมูล…</div>;
  return (
    <svg className="sparkline" viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none">
      {series.map((s, k) => {
        const max = s.max ?? Math.max(1, ...s.values);
        const pts = s.values.map((v, i) => `${(i / (n - 1)) * W},${height - 3 - (v / max) * (height - 6)}`);
        return (
          <g key={k}>
            <polyline points={`0,${height} ${pts.join(' ')} ${((s.values.length - 1) / (n - 1)) * W},${height}`} fill={s.color} opacity={0.12} stroke="none" />
            <polyline points={pts.join(' ')} fill="none" stroke={s.color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
          </g>
        );
      })}
    </svg>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}
