import { Pin } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button, Card, Input } from '../../../components/ui';

interface ToolModulesPanelProps {
  pinnedToolIds: string[];
  onTogglePin: (toolId: string) => void;
}

function randomDeviceName() {
  const code = Math.floor(100 + Math.random() * 900);
  return `LAH-IT-${code}`;
}

export function ToolModulesPanel({ pinnedToolIds, onTogglePin }: ToolModulesPanelProps) {
  const [ipValue, setIpValue] = useState('');
  const [portValue, setPortValue] = useState('');
  const [ticketValue, setTicketValue] = useState('');
  const [deviceName, setDeviceName] = useState(randomDeviceName());

  const ipStatus = useMemo(() => {
    if (!ipValue.trim()) return 'Enter an IP address.';
    const ok = /^(\d{1,3}\.){3}\d{1,3}$/.test(ipValue.trim());
    return ok ? 'Looks like a valid IPv4 format.' : 'Invalid IPv4 format.';
  }, [ipValue]);

  const portStatus = useMemo(() => {
    const value = Number(portValue);
    if (!portValue.trim()) return 'Enter a port (1-65535).';
    if (!Number.isInteger(value) || value < 1 || value > 65535) return 'Port must be between 1 and 65535.';
    if (value < 1024) return 'System port range. Validate access permissions.';
    return 'Valid user port range.';
  }, [portValue]);

  const ticketUrl = ticketValue.trim()
    ? `https://www.servicenow.com/search?q=${encodeURIComponent(ticketValue.trim())}`
    : '';

  const tools = [
    { id: 'ip-lookup', title: 'IP Lookup' },
    { id: 'port-checker', title: 'Port Checker' },
    { id: 'ticket-search', title: 'Ticket Quick Search' },
    { id: 'device-generator', title: 'Device Name Generator' },
  ];

  return (
    <Card title="Tool Modules" description="Fast mini-tools for recurring workplace operations.">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-zinc-950/60 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-white">IP Lookup</p>
            <button onClick={() => onTogglePin('ip-lookup')} className={`rounded-lg border p-1 ${pinnedToolIds.includes('ip-lookup') ? 'border-amber-300/40 bg-amber-400/20 text-amber-100' : 'border-white/10 bg-white/5 text-slate-300'}`}>
              <Pin className="h-3.5 w-3.5" />
            </button>
          </div>
          <Input value={ipValue} onChange={(e) => setIpValue(e.target.value)} placeholder="10.42.0.15" />
          <p className="mt-2 text-xs text-slate-400">{ipStatus}</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-zinc-950/60 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Port Checker</p>
            <button onClick={() => onTogglePin('port-checker')} className={`rounded-lg border p-1 ${pinnedToolIds.includes('port-checker') ? 'border-amber-300/40 bg-amber-400/20 text-amber-100' : 'border-white/10 bg-white/5 text-slate-300'}`}>
              <Pin className="h-3.5 w-3.5" />
            </button>
          </div>
          <Input value={portValue} onChange={(e) => setPortValue(e.target.value)} placeholder="443" />
          <p className="mt-2 text-xs text-slate-400">{portStatus}</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-zinc-950/60 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Ticket Quick Search</p>
            <button onClick={() => onTogglePin('ticket-search')} className={`rounded-lg border p-1 ${pinnedToolIds.includes('ticket-search') ? 'border-amber-300/40 bg-amber-400/20 text-amber-100' : 'border-white/10 bg-white/5 text-slate-300'}`}>
              <Pin className="h-3.5 w-3.5" />
            </button>
          </div>
          <Input value={ticketValue} onChange={(e) => setTicketValue(e.target.value)} placeholder="INC0012345" />
          {ticketUrl ? (
            <a href={ticketUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs text-cyan-300 hover:text-cyan-200">
              Search ticket
            </a>
          ) : (
            <p className="mt-2 text-xs text-slate-400">Enter ticket ID to open search.</p>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-zinc-950/60 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Device Name Generator</p>
            <button onClick={() => onTogglePin('device-generator')} className={`rounded-lg border p-1 ${pinnedToolIds.includes('device-generator') ? 'border-amber-300/40 bg-amber-400/20 text-amber-100' : 'border-white/10 bg-white/5 text-slate-300'}`}>
              <Pin className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-emerald-200">{deviceName}</div>
          <Button variant="outline" onClick={() => setDeviceName(randomDeviceName())} className="mt-2 w-full">
            Generate
          </Button>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">Pinned tools: {tools.filter((tool) => pinnedToolIds.includes(tool.id)).length}</p>
    </Card>
  );
}
