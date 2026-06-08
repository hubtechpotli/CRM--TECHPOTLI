export const LEAD_SOURCES = ["REFERRAL", "GOOGLE", "INSTAGRAM", "FACEBOOK", "WALK_IN", "OTHER"] as const;
export const LEAD_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "HOT"] as const;
export const LEAD_STATUSES = [
  "NEW",
  "ASSIGNED",
  "CONTACTED",
  "FOLLOW_UP",
  "PROPOSAL_SENT",
  "NEGOTIATION",
  "WON",
  "LOST",
  "ON_HOLD",
] as const;
export const LEAD_PIPELINE_STATUSES = [
  "CONTACTED",
  "FOLLOW_UP",
  "PROPOSAL_SENT",
  "NEGOTIATION",
  "ON_HOLD",
] as const;
export const LEAD_ACTIVITY_TYPES = ["CALL", "EMAIL", "WHATSAPP", "MEETING", "NOTE"] as const;
export const CONTACT_STATUSES = ["REACHED", "NOT_REACHED", "CALL_BACK_LATER", "NUMBER_INVALID"] as const;
export const SERVICE_TYPES = ["WEBSITE_DEV", "SEO", "ADS_MANAGEMENT", "SOCIAL_MEDIA", "CUSTOM"] as const;
export const PAYMENT_TYPES = ["ONE_TIME", "MONTHLY", "ANNUAL"] as const;
export const PAYMENT_STATUSES = ["PAID", "PARTIAL", "PENDING", "OVERDUE"] as const;
export const VAULT_TYPES = ["GMAIL", "FACEBOOK", "INSTAGRAM", "YOUTUBE"] as const;
export const DOCUMENT_TYPES = [
  "PAN_CARD",
  "GST_CERTIFICATE",
  "AADHAAR",
  "COMPANY_REGISTRATION",
  "PARTNERSHIP_DEED",
  "MSME_CERTIFICATE",
  "BUSINESS_LOGO",
  "SIGNED_AGREEMENT",
  "PAYMENT_SCREENSHOT",
  "CUSTOM",
] as const;
export const PROJECT_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export const PROJECT_STATUSES = [
  "NEW",
  "DESIGN",
  "DEVELOPMENT",
  "TESTING",
  "CLIENT_REVIEW",
  "COMPLETED",
  "ON_HOLD",
] as const;
export const QUOTATION_STATUSES = ["DRAFT", "SENT", "APPROVED", "REJECTED", "EXPIRED"] as const;
export const EXPENSE_CATEGORIES = ["VENDOR", "SALARY", "TOOLS", "OFFICE", "ADS", "OTHER"] as const;
export const PAYMENT_METHODS = ["CASH", "UPI", "BANK_TRANSFER", "CHEQUE", "CARD"] as const;
export const RENEWAL_TYPES = ["DOMAIN", "HOSTING", "WEBSITE_SUBSCRIPTION", "SEO", "ADS_CONTRACT", "SSL"] as const;
export const USER_ROLES = ["SUPER_ADMIN", "ADMIN", "EMPLOYEE"] as const;
export const TICKET_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export const TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED", "CLOSED"] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];
export type LeadPriority = (typeof LEAD_PRIORITIES)[number];
export type LeadActivityType = (typeof LEAD_ACTIVITY_TYPES)[number];
export type ServiceType = (typeof SERVICE_TYPES)[number];
export type ProjectPriority = (typeof PROJECT_PRIORITIES)[number];

export type Assignee = { id: string; name: string };
