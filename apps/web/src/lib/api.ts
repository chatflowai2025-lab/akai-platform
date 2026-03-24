const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'API error');
  }

  return res.json();
}

// Sales
export const salesApi = {
  triggerCall: (data: { phone: string; name: string; businessContext: Record<string, unknown>; teamId: string }) =>
    apiFetch('/api/modules/sales/call', { method: 'POST', body: JSON.stringify(data) }),
  getCalls: () =>
    apiFetch('/api/modules/sales/calls'),
};

// Teams
export const teamsApi = {
  getTeam: (teamId: string) =>
    apiFetch(`/api/teams/${teamId}`),
  updateTeam: (teamId: string, data: Record<string, unknown>) =>
    apiFetch(`/api/teams/${teamId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  inviteMember: (teamId: string, email: string, role: string) =>
    apiFetch(`/api/teams/${teamId}/invite`, { method: 'POST', body: JSON.stringify({ email, role }) }),
};

// Chat
export const chatApi = {
  send: (message: string, state?: Record<string, unknown>, messages?: unknown[]) =>
    apiFetch('/api/chat', { method: 'POST', body: JSON.stringify({ message, state, messages }) }),
};

export default apiFetch;
