# UI/UX Fix Report — TechPotli CRM

**Date:** 2026-06-11  
**Scope:** Dashboard UI, avatars, lead pipeline, customer modules (hosting/domains/services), modal cropping, enterprise theme tokens

---

## Phase 1 — Lead Sources overlap

| Field | Detail |
|-------|--------|
| **Issue** | "Top: INSTAGRAM" subtitle badge overlapped chart/legend in narrow columns |
| **Root cause** | Top source rendered in `SectionCard` subtitle (header row) competing with chart; legend labels had no truncation |
| **Fix** | Moved top source into card body as a separate flex-wrapped pill; stacked chart/legend vertically on small screens; added `truncate` on legend labels |
| **Files** | `frontend/components/dashboard/lead-source-chart.tsx` |
| **Risk** | Low — layout-only |
| **Validation** | `tsc --noEmit` pass; `npm run build` pass |

---

## Phase 2 — Recent Activity avatars

| Field | Detail |
|-------|--------|
| **Issue** | Dull gray module icons; "New" badge clipped outside card |
| **Root cause** | Generic icon circles; absolutely positioned badge with no reserved space |
| **Fix** | `UserAvatar` with deterministic `avatarColorFor` + `initialsForName`; inline "New" badge in flex row |
| **Files** | `frontend/components/dashboard/activity-sidebar.tsx`, `frontend/lib/avatar-colors.ts` |
| **Risk** | Low |
| **Validation** | Build pass |

---

## Phase 3 — Recent Leads colorful avatars

| Field | Detail |
|-------|--------|
| **Issue** | Lead/company avatars were plain gray squares |
| **Root cause** | `CompanyAvatar` used fixed `bg-zinc-700` single initial |
| **Fix** | `CompanyAvatar` → rounded-full, hash-based palette, two-letter initials; status badges show icons |
| **Files** | `frontend/components/leads/lead-badges.tsx`, `frontend/components/dashboard/recent-leads-panel.tsx`, `frontend/components/ui/user-avatar.tsx` |
| **Risk** | Low — reused existing palette |
| **Validation** | Build pass |

---

## Phase 4 — Lead pipeline colors

| Field | Detail |
|-------|--------|
| **Issue** | Pipeline steps mostly neutral; status colors didn't match CRM spec |
| **Root cause** | `LEAD_STATUS_META` used overlapping hues; stepper used primary/black for active step |
| **Fix** | Updated status meta (Blue/Purple/Cyan/Amber/Orange/Pink/Green/Red); pipeline stepper uses per-status accent colors |
| **Files** | `frontend/lib/lead-ui.ts`, `frontend/components/leads/lead-pipeline-stepper.tsx` |
| **Risk** | Low — visual only, no API changes |
| **Validation** | Build pass |

---

## Phase 5 — Customer directory avatars

| Field | Detail |
|-------|--------|
| **Issue** | Company column used gray avatars |
| **Root cause** | Shared `CompanyAvatar` not using color system |
| **Fix** | Same colorful `CompanyAvatar` in `CustomerListTable`; truncate long names |
| **Files** | `frontend/components/customers/customer-queue-list.tsx`, `frontend/components/leads/lead-badges.tsx` |
| **Risk** | Low |
| **Validation** | Build pass |

---

## Phase 6 — Hosting save 500

| Field | Detail |
|-------|--------|
| **Issue** | Saving hosting returned Internal Server Error |
| **Root cause** | (1) Missing/invalid `ENCRYPTION_KEY` caused uncaught crypto error when username/password set; (2) invalid dates; (3) optimistic mutation cleared form before retry sent empty POST |
| **Fix** | `EncryptionService` throws clear `BadRequestException`; `createHosting` validates provider + renewal date; hosting mutation passes `{ editingId, body }` variables, `retry: 0`, closes modal on success only |
| **Files** | `backend/src/common/encryption.service.ts`, `backend/src/customers/customers.service.ts`, `frontend/components/customers/customer-hosting-panel.tsx` |
| **Risk** | Low — preserves schema; clearer errors when encryption not configured |
| **Validation** | Backend `tsc --noEmit` pass |

---

## Phase 7 — Domain save 500

| Field | Detail |
|-------|--------|
| **Issue** | Saving domain returned Internal Server Error |
| **Root cause** | Same as hosting: encryption key, invalid expiry date, mutation retry with cleared state |
| **Fix** | `createDomain` validates domain name + expiry date; domains mutation uses variables + `retry: 0` |
| **Files** | `backend/src/customers/customers.service.ts`, `frontend/components/customers/customer-domains-panel.tsx` |
| **Risk** | Low |
| **Validation** | Backend `tsc` pass |

---

## Phase 8 — Services edit null id

| Field | Detail |
|-------|--------|
| **Issue** | `Cannot read properties of null (reading 'id')` on service edit |
| **Root cause** | `updateMutation` read `editing!.id` from React state cleared in `onMutate`; global `mutations.retry: 1` re-ran with null `editing` |
| **Fix** | Pass `{ serviceId, body }` as mutation variables; clear modal on `onSuccess` only; `retry: 0` |
| **Files** | `frontend/components/customers/customer-services-panel.tsx` |
| **Risk** | Low |
| **Validation** | Frontend `tsc` pass |

---

## Phase 9 — Customer profile modal cropping

| Field | Detail |
|-------|--------|
| **Issue** | Log call / hosting / domain modals clipped buttons and form content |
| **Root cause** | `Dialog.Content` used `overflow-hidden` without scrollable body or max height |
| **Fix** | Modal: `max-h-[min(90vh,820px)]`, flex column, scrollable body with `crm-card-padding` |
| **Files** | `frontend/components/ui/modal.tsx` |
| **Risk** | Low |
| **Validation** | Build pass |

---

## Phase 10 — Enterprise theme polish

| Field | Detail |
|-------|--------|
| **Issue** | Generic admin template feel |
| **Fix** | Warm white background `#FAFAFA`, deep navy primary `#0F172A`, gold accent `#C9A227` in CSS tokens |
| **Files** | `frontend/app/globals.css` |
| **Risk** | Low — token-only, no component rewrites |
| **Validation** | Build pass |

---

## Validation summary

| Check | Result |
|-------|--------|
| Frontend `tsc --noEmit` | Pass |
| Frontend `npm run build` | Pass |
| Backend `tsc --noEmit` | Pass |
| Database schema changes | None |
| Breaking API changes | None |

---

## Manual QA checklist

- [ ] Dashboard → Lead Sources: top badge readable, no overlap
- [ ] Dashboard → Recent Activity: colored avatars, "New" badge visible
- [ ] Dashboard → Recent Leads: colored company avatars + status icons
- [ ] Lead detail → pipeline shows per-status colors
- [ ] Customers list → colorful company avatars (e.g. TP, BH)
- [ ] Customer → Hosting: add/edit saves (or shows clear encryption error)
- [ ] Customer → Domains: add/edit saves
- [ ] Customer → Services: edit saves without null error
- [ ] Customer → Log call modal: full form + buttons visible, scrollable if tall

---

## Production note — ENCRYPTION_KEY

If hosting/domain save returns *"Credential storage is not configured"*, set in `backend/.env`:

```env
ENCRYPTION_KEY=<64-character-hex-string>
```

Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
