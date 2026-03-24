// Lead management — Firestore integration

export interface LeadInput {
  teamId: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  source: string;
}

// Placeholder — implement with Firestore
export async function createLead(lead: LeadInput) {
  console.log('[Leads] createLead:', lead);
  return { id: `lead_${Date.now()}`, ...lead, status: 'new', createdAt: new Date().toISOString() };
}

export async function updateLeadStatus(leadId: string, status: string, callId?: string) {
  console.log('[Leads] updateStatus:', leadId, status, callId);
}

export async function getLeads(teamId: string) {
  console.log('[Leads] getLeads:', teamId);
  return [];
}
