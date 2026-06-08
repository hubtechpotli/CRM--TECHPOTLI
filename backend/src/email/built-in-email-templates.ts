import { LeadEmailPurpose, CustomerAiPurpose, RecipientType } from './email-purposes';

function esc(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function greetingLine(contactName?: string | null, companyName?: string | null) {
  const name = (contactName || '').trim();
  if (name) return `Hi ${esc(name)},`;
  const company = (companyName || '').trim();
  return company ? `Hello ${esc(company)} team,` : 'Hello,';
}

export type BuiltInDraft = {
  subject: string;
  bodyHtml: string; // fragment (<p>...</p>)
};

export function buildBuiltInDraft(input: {
  recipientType: RecipientType;
  purpose: string;
  companyName?: string | null;
  contactName?: string | null;
  assignedToName?: string | null;
  website?: string | null;
}): BuiltInDraft | null {
  const company = (input.companyName || '').trim();
  const contact = (input.contactName || '').trim();
  const signName = (input.assignedToName || 'TechPotli Team').trim();
  const greet = greetingLine(contact, company);

  if (input.recipientType === 'lead') {
    const p = input.purpose as LeadEmailPurpose;
    const baseSign = `<p style="margin:16px 0 0">Best regards,<br/>${esc(signName)}</p>`;

    switch (p) {
      case 'FOLLOW_UP':
        return {
          subject: `${company || 'Quick follow up'} — TechPotli`,
          bodyHtml: `<p style="margin:0 0 12px">${greet}</p>
<p style="margin:0 0 12px">Just following up on your inquiry. I’d love to understand your requirements and share the best approach for ${company ? esc(company) : 'your project'}.</p>
<p style="margin:0 0 12px">Would you be available for a quick call today or tomorrow?</p>
${baseSign}`,
        };
      case 'QUOTATION_FOLLOW_UP':
        return {
          subject: `${company || 'Quotation'} — quotation follow-up`,
          bodyHtml: `<p style="margin:0 0 12px">${greet}</p>
<p style="margin:0 0 12px">Sharing a quick follow-up regarding the quotation we sent earlier. If you have any questions or would like a revised scope, we can update it quickly.</p>
<p style="margin:0 0 12px">Shall we connect for 10 minutes to finalize next steps?</p>
${baseSign}`,
        };
      case 'MEETING_REQUEST':
        return {
          subject: `${company || 'Schedule a call'} — quick discussion`,
          bodyHtml: `<p style="margin:0 0 12px">${greet}</p>
<p style="margin:0 0 12px">I’d like to schedule a brief discovery call to understand your goals and recommend the best plan.</p>
<p style="margin:0 0 12px">Please share a convenient time, or I can propose a couple of slots.</p>
${baseSign}`,
        };
      case 'PROPOSAL_DISCUSSION':
        return {
          subject: `${company || 'Proposal'} — discussion & next steps`,
          bodyHtml: `<p style="margin:0 0 12px">${greet}</p>
<p style="margin:0 0 12px">I wanted to connect to discuss the proposal details and confirm the next steps. We can align on timeline, deliverables, and any changes you need.</p>
<p style="margin:0 0 12px">Are you available for a quick call?</p>
${baseSign}`,
        };
      case 'GENERAL_OUTREACH':
        return {
          subject: `${company || 'Hello'} — TechPotli`,
          bodyHtml: `<p style="margin:0 0 12px">${greet}</p>
<p style="margin:0 0 12px">Hope you’re doing well. We help businesses with website, branding, and growth-focused digital solutions.</p>
<p style="margin:0 0 12px">If you’d like, share what you’re planning and I’ll suggest a simple roadmap.</p>
${baseSign}`,
        };
    }
  }

  if (input.recipientType === 'customer') {
    const p = input.purpose as CustomerAiPurpose;
    const baseSign = `<p style="margin:16px 0 0">Warm regards,<br/>${esc(signName)}</p>`;
    const websiteLine = input.website ? `<p style="margin:0 0 12px">Website: <strong>${esc(input.website)}</strong></p>` : '';

    switch (p) {
      case 'CHECK_IN':
        return {
          subject: `${company || 'Quick check-in'} — TechPotli`,
          bodyHtml: `<p style="margin:0 0 12px">${greet}</p>
<p style="margin:0 0 12px">Just checking in to see if everything is going smoothly and if you need any updates or support from our side.</p>
${websiteLine}
<p style="margin:0 0 12px">Anything you’d like us to improve or help with this week?</p>
${baseSign}`,
        };
      case 'PROJECT_UPDATE':
        return {
          subject: `${company || 'Project update'} — latest progress`,
          bodyHtml: `<p style="margin:0 0 12px">${greet}</p>
<p style="margin:0 0 12px">Sharing a quick project update. We’re progressing as planned and will share the next milestone shortly.</p>
<p style="margin:0 0 12px">If you have any new inputs or changes, please reply here and we’ll incorporate them.</p>
${baseSign}`,
        };
      case 'THANK_YOU':
        return {
          subject: `${company || 'Thank you'} — TechPotli`,
          bodyHtml: `<p style="margin:0 0 12px">${greet}</p>
<p style="margin:0 0 12px">Thank you for your continued trust in TechPotli. We appreciate the opportunity to work with you.</p>
<p style="margin:0 0 12px">If you need anything at all, just reply to this email.</p>
${baseSign}`,
        };
      case 'GENERAL_OUTREACH':
        return {
          subject: `${company || 'Hello'} — quick note`,
          bodyHtml: `<p style="margin:0 0 12px">${greet}</p>
<p style="margin:0 0 12px">Reaching out with a quick note. If you have any upcoming requirements (updates, renewals, new pages, marketing), we can plan it out and share the best timeline.</p>
<p style="margin:0 0 12px">Just reply with what you need and we’ll take it from there.</p>
${baseSign}`,
        };
    }
  }

  return null;
}

