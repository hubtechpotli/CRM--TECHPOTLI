"use client";

import { GlassCard } from "@/components/ui/glass-card";
import { customerStatusLabel } from "@/lib/customer-status";

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function InfoRow({ label, value, link }: { label: string; value: unknown; link?: boolean }) {
  const text = value != null && String(value).trim() ? String(value) : "—";
  return (
    <div className="flex justify-between gap-4 border-b border-border/30 py-2 text-sm last:border-0">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="text-right">
        {link && text !== "—" ? (
          <a href={text.startsWith("http") ? text : `https://${text}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            {text}
          </a>
        ) : (
          text
        )}
      </dd>
    </div>
  );
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <GlassCard>
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <dl>{children}</dl>
    </GlassCard>
  );
}

export function CustomerProfileSections({ data }: { data: Record<string, unknown> }) {
  const employee = data.assignedEmployee as { name?: string } | undefined;
  const services = (data.services as Array<Record<string, unknown>> | undefined) ?? [];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <InfoSection title="Basic Information">
          <InfoRow label="Company Name" value={data.companyName} />
          <InfoRow label="Owner Name" value={data.ownerName} />
          <InfoRow label="Email Address" value={data.email} />
          <InfoRow label="Mobile Number" value={data.phone} />
          <InfoRow label="Alternate Phone" value={data.alternatePhone} />
          <InfoRow label="Address" value={data.address} />
          <InfoRow label="Pincode" value={data.pincode} />
          <InfoRow label="State" value={data.state} />
          <InfoRow label="GST Number" value={data.gstNumber} />
          <InfoRow label="Nature of Business" value={data.natureOfBusiness} />
          <InfoRow label="Assigned Employee" value={employee?.name} />
          <InfoRow label="Account status" value={customerStatusLabel(String(data.status ?? "ACTIVE"))} />
          <InfoRow label="Remarks" value={data.remarks} />
        </InfoSection>

        <InfoSection title="Website Information">
          <InfoRow label="Domain" value={data.domain} link />
          <InfoRow label="Hosting" value={data.hosting} />
          <InfoRow label="Vercel Link" value={data.vercalLink} link />
          <InfoRow label="Live Website Link" value={data.liveWebsiteLink} link />
          <InfoRow label="Reference Website Link" value={data.referenceWebsiteLink} link />
        </InfoSection>

        <InfoSection title="Social Media Information">
          <InfoRow label="Facebook URL" value={data.facebookUrl} link />
          <InfoRow label="Instagram URL" value={data.instagramUrl} link />
          <InfoRow label="YouTube URL" value={data.youtubeUrl} link />
        </InfoSection>

        <InfoSection title="Active Services">
          {services.length ? (
            services.map((s) => (
              <div key={String(s.id)} className="border-b border-border/30 py-2 text-sm last:border-0">
                <div className="flex justify-between font-medium">
                  <span>{formatLabel(String(s.serviceType ?? "Service"))}</span>
                  <span>
                    {s.oneTimeAmount ? `₹${s.oneTimeAmount} one-time` : null}
                    {s.oneTimeAmount && s.monthlyAmount ? " · " : null}
                    {s.monthlyAmount ? `₹${s.monthlyAmount}/mo` : null}
                    {!s.oneTimeAmount && !s.monthlyAmount ? "—" : null}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatLabel(String(s.paymentType ?? ""))}
                  {s.isActive === false ? " · Inactive" : ""}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No services configured — add them in the Services tab.</p>
          )}
        </InfoSection>
      </div>
    </div>
  );
}
