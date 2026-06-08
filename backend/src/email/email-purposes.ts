import { CustomerEmailReason } from '../mail/templates/customer-notice.template';

export type RecipientType = 'lead' | 'customer';

export type LeadEmailPurpose =
  | 'FOLLOW_UP'
  | 'QUOTATION_FOLLOW_UP'
  | 'MEETING_REQUEST'
  | 'PROPOSAL_DISCUSSION'
  | 'GENERAL_OUTREACH';

export type CustomerAiPurpose = 'CHECK_IN' | 'PROJECT_UPDATE' | 'THANK_YOU' | 'GENERAL_OUTREACH';

export type EmailPurpose = LeadEmailPurpose | CustomerAiPurpose | CustomerEmailReason;

export const LEAD_EMAIL_PURPOSES: { id: LeadEmailPurpose; label: string; description: string }[] = [
  { id: 'FOLLOW_UP', label: 'Follow up on inquiry', description: 'Check in after initial contact or last conversation' },
  { id: 'QUOTATION_FOLLOW_UP', label: 'Quotation follow-up', description: 'Follow up on a sent quotation' },
  { id: 'MEETING_REQUEST', label: 'Schedule a call', description: 'Request a meeting or discovery call' },
  { id: 'PROPOSAL_DISCUSSION', label: 'Discuss proposal', description: 'Talk through proposal details or next steps' },
  { id: 'GENERAL_OUTREACH', label: 'General outreach', description: 'General professional email to the lead' },
];

export const CUSTOMER_AI_PURPOSES: { id: CustomerAiPurpose; label: string; description: string }[] = [
  { id: 'CHECK_IN', label: 'General check-in', description: 'Friendly check-in with an existing customer' },
  { id: 'PROJECT_UPDATE', label: 'Project update', description: 'Share project progress or next milestones' },
  { id: 'THANK_YOU', label: 'Thank you', description: 'Thank customer after payment or milestone' },
  { id: 'GENERAL_OUTREACH', label: 'General message', description: 'General email to the customer' },
];

export const CUSTOMER_TEMPLATE_PURPOSES: { id: CustomerEmailReason; label: string; description: string }[] = [
  { id: 'PAYMENT_PENDING', label: 'Payment pending', description: 'Reminder about outstanding payment' },
  { id: 'PAYMENT_OVERDUE', label: 'Payment overdue', description: 'Urgent overdue payment notice' },
  { id: 'RENEWAL_DUE', label: 'Renewal due', description: 'Domain, hosting or service renewal reminder' },
  { id: 'MAINTENANCE_CLOSURE', label: 'Maintenance notice', description: 'Website maintenance or service suspension notice' },
];

export const CUSTOMER_PAYMENT_PURPOSES = new Set<string>(
  CUSTOMER_TEMPLATE_PURPOSES.map((p) => p.id),
);

export function listPurposes(recipientType: RecipientType) {
  if (recipientType === 'lead') return LEAD_EMAIL_PURPOSES;
  return [...CUSTOMER_AI_PURPOSES, ...CUSTOMER_TEMPLATE_PURPOSES];
}

export function purposePrompt(recipientType: RecipientType, purpose: string): string {
  const leadPrompts: Record<LeadEmailPurpose, string> = {
    FOLLOW_UP: 'follow-up email after a sales inquiry',
    QUOTATION_FOLLOW_UP: 'follow-up email about a quotation we sent',
    MEETING_REQUEST: 'email to schedule a discovery call or meeting',
    PROPOSAL_DISCUSSION: 'email to discuss our proposal and next steps',
    GENERAL_OUTREACH: 'professional outreach email',
  };
  const customerPrompts: Record<CustomerAiPurpose, string> = {
    CHECK_IN: 'friendly check-in email with an existing client',
    PROJECT_UPDATE: 'project status update email to a client',
    THANK_YOU: 'thank-you email to a valued client',
    GENERAL_OUTREACH: 'professional email to an existing client',
  };
  if (recipientType === 'lead') return leadPrompts[purpose as LeadEmailPurpose] || 'sales follow-up email';
  return customerPrompts[purpose as CustomerAiPurpose] || 'client email';
}
