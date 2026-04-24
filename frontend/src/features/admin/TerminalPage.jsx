import { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { Card, CardHeader } from '../../app/ui/Card';
import { useCurrentUser } from '../../app/hooks/useCurrentUser';

function buildTerminalWsUrl() {
  if (typeof window === 'undefined') {
    return '';
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws/terminal`;
}

export function TerminalPage() {
  const { authenticated, isAdmin, loading } = useCurrentUser();
  const containerRef = useRef(null);
  const terminalRef = useRef(null);
  const fitAddonRef = useRef(null);
  const socketRef = useRef(null);
  const [status, setStatus] = useState('Connecting...');

  useEffect(() => {
    if (loading || !authenticated || !isAdmin) {
      return undefined;
    }

    const terminal = new Terminal({
      convertEol: true,
      cursorBlink: true,
      fontFamily: 'IBM Plex Mono, monospace',
      fontSize: 13,
      theme: {
        background: '#0b1215',
        foreground: '#d7f7ef',
      },
      allowProposedApi: false,
    });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    const target = containerRef.current;
    if (!target) {
      return undefined;
    }

    terminal.open(target);
    fitAddon.fit();

    const socket = new WebSocket(buildTerminalWsUrl());
    socketRef.current = socket;

    socket.onopen = () => {
      setStatus('Connected');
      fitAddon.fit();
      const dims = { cols: terminal.cols, rows: terminal.rows };
      socket.send(JSON.stringify({ type: 'resize', ...dims }));
    };

    socket.onmessage = (event) => {
      terminal.write(String(event.data || ''));
    };

    socket.onclose = () => {
      setStatus('Disconnected');
    };

    socket.onerror = () => {
      setStatus('Error');
    };

    const onDataDisposable = terminal.onData((data) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(data);
      }
    });

    const onResize = () => {
      fitAddon.fit();
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'resize', cols: terminal.cols, rows: terminal.rows }));
      }
    };

    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      try {
        onDataDisposable.dispose();
      } catch {
        // no-op
      }
      try {
        socket.close();
      } catch {
        // no-op
      }
      try {
        terminal.dispose();
      } catch {
        // no-op
      }
      socketRef.current = null;
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [authenticated, isAdmin, loading]);

  useEffect(() => {
    if (loading) {
      return;
    }
    if (authenticated && isAdmin) {
      return;
    }
    if (socketRef.current) {
      try {
        socketRef.current.close();
      } catch {
        // no-op
      }
    }
  }, [authenticated, isAdmin, loading]);

  return (
    <section className="module">
      <Card>
        <CardHeader
          eyebrow="/app/terminal"
          title="Secure Terminal"
          description={`Status: ${status}. Access restricted to admin users.`}
        />
        <div
          ref={containerRef}
          style={{
            height: '70vh',
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        />
      </Card>
    </section>
  );
}
