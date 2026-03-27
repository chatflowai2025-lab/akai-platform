// Lightweight client-side agent action logger
// Writes to Firestore: users/{uid}/agentLogs/{timestamp}
// Used for debugging state sync issues

export interface AgentLogEntry {
  agent: string;
  action: string;
  module: string;
  status: 'success' | 'error' | 'warning';
  detail?: string;
  timestamp: string;
}

export function logAgentAction(entry: Omit<AgentLogEntry, 'timestamp'>) {
  // Non-blocking — never throws
  try {
    const full: AgentLogEntry = { ...entry, timestamp: new Date().toISOString() };
    // Store in memory for this session
    if (typeof window !== 'undefined') {
      const logs = ((window as unknown as Record<string, unknown>).__AKAI_AGENT_LOGS__ as AgentLogEntry[]) || [];
      logs.push(full);
      (window as unknown as Record<string, unknown>).__AKAI_AGENT_LOGS__ = logs.slice(-100); // keep last 100
    }
    // Console in dev
    if (process.env.NODE_ENV === 'development') {
      console.log(`[AKAI:${entry.agent}] ${entry.action} — ${entry.status}`, entry.detail || '');
    }
  } catch { /* never throw */ }
}

export function getAgentLogs(): AgentLogEntry[] {
  if (typeof window === 'undefined') return [];
  return ((window as unknown as Record<string, unknown>).__AKAI_AGENT_LOGS__ as AgentLogEntry[]) || [];
}
