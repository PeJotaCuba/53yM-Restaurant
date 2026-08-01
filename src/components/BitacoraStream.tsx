import React from 'react';
import { api } from '../../convex/_generated/api';
import { useQuery } from 'convex/react';
import { Activity, ShieldCheck, Clock, Terminal } from 'lucide-react';

interface BitacoraStreamProps {
  requesterRole?: string;
}

export function BitacoraStream({ requesterRole }: BitacoraStreamProps) {
  const isAuthorized = requesterRole === 'admin' || requesterRole === 'manager';

  // Real-time reactive Convex query streaming audit logs, skipped if not authorized
  const logs = useQuery(
    api.bitacora.getLiveLogs,
    isAuthorized ? { limit: 50, requesterRole } : "skip"
  );

  if (!isAuthorized) {
    return null;
  }

  if (!logs) {
    return (
      <div className="bg-stone-900 text-stone-400 p-4 rounded-2xl border border-stone-800 text-xs flex items-center gap-2">
        <Clock className="w-4 h-4 animate-spin text-amber-400" />
        <span>Conectando con la bitácora operacional Convex en tiempo real...</span>
      </div>
    );
  }

  return (
    <div className="bg-stone-950 border border-stone-800 rounded-3xl p-5 shadow-2xl text-stone-200 mt-8">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-sm text-stone-100 flex items-center gap-2">
              Bitácora Operacional en Vivo
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            </h3>
            <p className="text-[11px] text-stone-400">
              Registro inalterable en tiempo real transmitido vía WebSocket (Convex DB)
            </p>
          </div>
        </div>

        <span className="bg-stone-800 text-amber-400 border border-stone-700 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase">
          {logs.length} Registros Live
        </span>
      </div>

      <div className="max-h-60 overflow-y-auto space-y-2 pr-1 font-mono text-xs scrollbar-thin scrollbar-thumb-stone-800">
        {logs.map((log: any) => {
          const time = new Date(log.timestamp).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });

          return (
            <div
              key={log._id}
              className="bg-stone-900/80 hover:bg-stone-900 p-2.5 rounded-xl border border-stone-800/80 flex items-start gap-3 transition-colors"
            >
              <span className="text-stone-500 text-[10px] whitespace-nowrap pt-0.5">{time}</span>
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] uppercase font-bold whitespace-nowrap">
                {log.userRole || 'SISTEMA'}
              </span>
              <span className="text-stone-300 font-bold whitespace-nowrap text-[11px]">
                @{log.username || 'usuario'}:
              </span>
              <p className="text-stone-200 text-xs font-sans leading-snug flex-grow">{log.action}</p>
            </div>
          );
        })}

        {logs.length === 0 && (
          <div className="text-center py-6 text-stone-500 text-xs">
            No hay registros de bitácora recientes en el servidor Convex.
          </div>
        )}
      </div>
    </div>
  );
}
