-- Full-text search GIN indexes for global search (Module 25)
-- Applied after init migration

CREATE INDEX "Customer_fts_idx" ON "Customer" USING GIN (
  to_tsvector('english',
    coalesce("companyName", '') || ' ' ||
    coalesce("ownerName", '') || ' ' ||
    coalesce("phone", '') || ' ' ||
    coalesce("alternatePhone", '') || ' ' ||
    coalesce("email", '')
  )
);

CREATE INDEX "Lead_fts_idx" ON "Lead" USING GIN (
  to_tsvector('english',
    coalesce("companyName", '') || ' ' ||
    coalesce("contactName", '') || ' ' ||
    coalesce("phone", '') || ' ' ||
    coalesce("email", '')
  )
);

CREATE INDEX "User_fts_idx" ON "User" USING GIN (
  to_tsvector('english',
    coalesce("name", '') || ' ' ||
    coalesce("email", '') || ' ' ||
    coalesce("phone", '')
  )
);

CREATE INDEX "Project_fts_idx" ON "Project" USING GIN (
  to_tsvector('english', coalesce("name", '') || ' ' || coalesce("briefNotes", ''))
);

CREATE INDEX "Invoice_fts_idx" ON "Invoice" USING GIN (
  to_tsvector('english', coalesce("invoiceNumber", '') || ' ' || coalesce("notes", ''))
);

CREATE INDEX "Domain_fts_idx" ON "Domain" USING GIN (
  to_tsvector('english', coalesce("domainName", '') || ' ' || coalesce("registrar", ''))
);

CREATE INDEX "HostingAccount_fts_idx" ON "HostingAccount" USING GIN (
  to_tsvector('english', coalesce("provider", '') || ' ' || coalesce("hostingPlan", '') || ' ' || coalesce("serverIp", ''))
);

CREATE INDEX "CustomerDocument_fts_idx" ON "CustomerDocument" USING GIN (
  to_tsvector('english', coalesce("filename", '') || ' ' || coalesce("customName", ''))
);

CREATE INDEX "SupportTicket_fts_idx" ON "SupportTicket" USING GIN (
  to_tsvector('english', coalesce("ticketNumber", '') || ' ' || coalesce("subject", '') || ' ' || coalesce("description", ''))
);
