import { buildBrandedEmailLayout, EMAIL_BRAND } from './email-layout.template';

type InvoiceEmailData = {
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  subtotal: number;
  gstAmount: number;
  grandTotal: number;
  customer?: {
    companyName?: string | null;
    ownerName?: string | null;
  } | null;
  lineItems?: Array<{ name: string; qty: number; rate: number; amount: number }>;
};

function formatMoney(value: number) {
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value: Date) {
  return value.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function buildInvoiceEmailHtml(invoice: InvoiceEmailData) {
  const company = invoice.customer?.companyName || 'Valued Customer';
  const owner = invoice.customer?.ownerName;
  const greeting = owner ? `${owner} · ${company}` : company;
  const items = (invoice.lineItems ?? []).slice(0, 4);
  const extraItems = (invoice.lineItems?.length ?? 0) - items.length;

  const lineRows = items
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#334155">${item.name}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#64748b;text-align:center">${item.qty}</td>
          <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;text-align:right;font-weight:600">${formatMoney(item.amount)}</td>
        </tr>`,
    )
    .join('');

  const itemsSection =
    items.length > 0
      ? `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 8px">
          <tr>
            <td style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${EMAIL_BRAND.goldDark};padding-bottom:8px">Services</td>
          </tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:11px;color:#94a3b8;padding-bottom:6px">Description</td>
            <td style="font-size:11px;color:#94a3b8;padding-bottom:6px;text-align:center;width:48px">Qty</td>
            <td style="font-size:11px;color:#94a3b8;padding-bottom:6px;text-align:right;width:100px">Amount</td>
          </tr>
          ${lineRows}
          ${extraItems > 0 ? `<tr><td colspan="3" style="padding:8px 0;font-size:12px;color:#94a3b8">+ ${extraItems} more item(s) in attached PDF</td></tr>` : ''}
        </table>`
      : '';

  const contentHtml = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px">
      <tr>
        <td>
          <p style="margin:0 0 6px;font-size:13px;color:#64748b">Bill to</p>
          <p style="margin:0;font-size:18px;font-weight:700;color:#0f172a">${greeting}</p>
        </td>
        <td align="right" valign="top">
          <div style="background:${EMAIL_BRAND.goldLight};border:1px solid ${EMAIL_BRAND.goldBorder};border-radius:10px;padding:10px 14px;text-align:center;display:inline-block">
            <p style="margin:0;font-size:10px;color:${EMAIL_BRAND.goldDark};text-transform:uppercase;letter-spacing:0.06em;font-weight:600">Invoice</p>
            <p style="margin:4px 0 0;font-size:15px;font-weight:700;color:${EMAIL_BRAND.text}">${invoice.invoiceNumber}</p>
          </div>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#475569">
      Thank you for choosing <strong style="color:${EMAIL_BRAND.goldDark}">TechPotli</strong>.
      Your invoice is attached as a PDF. A quick summary is below.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,${EMAIL_BRAND.goldLight} 0%,${EMAIL_BRAND.cream} 100%);border:1px solid ${EMAIL_BRAND.goldBorder};border-radius:14px;margin-bottom:24px">
      <tr>
        <td style="padding:22px 24px">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <p style="margin:0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:${EMAIL_BRAND.goldDark}">Amount due</p>
                <p style="margin:6px 0 0;font-size:32px;font-weight:800;color:${EMAIL_BRAND.charcoal};line-height:1">${formatMoney(invoice.grandTotal)}</p>
              </td>
              <td align="right" valign="middle">
                <p style="margin:0;font-size:12px;color:#64748b">Due by</p>
                <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#0f172a">${formatDate(invoice.dueDate)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px">
      <tr>
        <td width="33%" style="padding-right:8px">
          <div style="background:${EMAIL_BRAND.warmSurface};border:1px solid ${EMAIL_BRAND.border};border-radius:10px;padding:12px 14px">
            <p style="margin:0;font-size:10px;color:${EMAIL_BRAND.textLight};text-transform:uppercase;letter-spacing:0.05em">Issued</p>
            <p style="margin:4px 0 0;font-size:13px;font-weight:600;color:#334155">${formatDate(invoice.invoiceDate)}</p>
          </div>
        </td>
        <td width="33%" style="padding:0 4px">
          <div style="background:${EMAIL_BRAND.warmSurface};border:1px solid ${EMAIL_BRAND.border};border-radius:10px;padding:12px 14px">
            <p style="margin:0;font-size:10px;color:${EMAIL_BRAND.textLight};text-transform:uppercase;letter-spacing:0.05em">Subtotal</p>
            <p style="margin:4px 0 0;font-size:13px;font-weight:600;color:#334155">${formatMoney(invoice.subtotal)}</p>
          </div>
        </td>
        <td width="33%" style="padding-left:8px">
          <div style="background:${EMAIL_BRAND.warmSurface};border:1px solid ${EMAIL_BRAND.border};border-radius:10px;padding:12px 14px">
            <p style="margin:0;font-size:10px;color:${EMAIL_BRAND.textLight};text-transform:uppercase;letter-spacing:0.05em">GST</p>
            <p style="margin:4px 0 0;font-size:13px;font-weight:600;color:#334155">${formatMoney(invoice.gstAmount)}</p>
          </div>
        </td>
      </tr>
    </table>

    ${itemsSection}

    <div style="margin-top:24px;background:${EMAIL_BRAND.warmSurface};border:1px solid ${EMAIL_BRAND.border};border-left:4px solid ${EMAIL_BRAND.gold};border-radius:12px;padding:16px 18px">
      <p style="margin:0;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:${EMAIL_BRAND.goldDark}">PDF attached</p>
      <p style="margin:8px 0 0;font-size:14px;font-weight:700;color:${EMAIL_BRAND.text}">${invoice.invoiceNumber}.pdf</p>
      <p style="margin:6px 0 0;font-size:12px;color:${EMAIL_BRAND.textMuted};line-height:1.7">Open the attachment for full invoice details, bank info &amp; terms.</p>
    </div>

    <p style="margin:20px 0 0;font-size:11px;color:${EMAIL_BRAND.textLight};line-height:1.6">
      Payment due within 15 days as per invoice terms.
    </p>`;

  return buildBrandedEmailLayout({
    title: 'Your invoice is ready',
    subtitle: invoice.invoiceNumber,
    headerBadge: 'Invoice',
    contentHtml,
  });
}
