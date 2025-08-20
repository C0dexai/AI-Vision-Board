import React, { useRef, useEffect } from 'react';
import { OrchestrationLogEntry } from '../types';

interface OrchestrationLogProps {
  log: OrchestrationLogEntry[];
}

const statusStyles = {
    initiated: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
    completed: 'bg-green-500/20 text-green-300 border-green-500/50',
    failed: 'bg-red-500/20 text-red-300 border-red-500/50',
}

const StatusIcon = ({ status }: { status: OrchestrationLogEntry['status'] }) => {
    switch(status) {
        case 'initiated':
            return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
        case 'completed':
            return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
        case 'failed':
            return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    }
}

const OrchestrationLog: React.FC<OrchestrationLogProps> = ({ log }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
        logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [log]);

  return (
    <div className="bg-slate-900/80 backdrop-blur-md rounded-xl shadow-2xl shadow-purple-500/10 border border-slate-700/50 h-[678px] flex flex-col">
      <div className="p-4 border-b border-slate-700/50">
        <h3 className="text-xl font-display text-purple-400">Orchestration Log</h3>
        <p className="text-sm text-slate-400">Live Agent-to-Agent Communication</p>
      </div>
      <div ref={logContainerRef} className="flex-grow p-4 overflow-y-auto space-y-3 font-mono text-sm">
        {log.length === 0 && (
            <div className="text-center text-slate-500 pt-10">
                <p>Awaiting orchestration tasks...</p>
                <p className="mt-2 text-xs">Delegate tasks in chat using @mention.</p>
                <p className="text-xs">e.g., <span className="text-pink-400">@Lyra summarize vision</span></p>
            </div>
        )}
        {log.map(entry => (
            <div key={entry.id} className={`p-3 rounded-lg border-l-4 ${statusStyles[entry.status]}`}>
                <div className="flex justify-between items-center mb-1">
                    <div className="font-bold text-slate-200">
                        <span>{entry.sourceAgent}</span>
                        <span className="text-purple-400 mx-1">&rarr;</span>
                        <span>{entry.targetAgent}</span>
                    </div>
                     <span className="text-xs text-slate-500">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className="text-slate-300 break-words mb-2">Task: "{entry.task}"</p>
                <div className="flex items-center gap-2 text-xs">
                   <StatusIcon status={entry.status} />
                   <span className="font-semibold uppercase">{entry.status}</span>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default OrchestrationLog;
