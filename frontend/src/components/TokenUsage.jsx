import { BrainCircuit } from 'lucide-react';

function formatCount(value) {
  const count = Number(value || 0);
  return Number.isFinite(count) ? count.toLocaleString() : '0';
}

export function TokenUsage({ usage }) {
  const input = Number(usage?.input || 0);
  const output = Number(usage?.output || 0);
  const total = Number(usage?.total || input + output || 0);
  if (!total && !input && !output) {
    return null;
  }

  return (
    <div className="token-usage" role="status" aria-label="AI token usage">
      <BrainCircuit size={14} />
      <div className="token-usage__tooltip">
        <div className="token-usage__row"><span>Input</span><strong>{formatCount(input)}</strong></div>
        <div className="token-usage__row"><span>Output</span><strong>{formatCount(output)}</strong></div>
        <div className="token-usage__row"><span>Total</span><strong>{formatCount(total)}</strong></div>
      </div>
    </div>
  );
}

export default TokenUsage;
