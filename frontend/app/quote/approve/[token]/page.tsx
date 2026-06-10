"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import { GlassCard } from "@/components/ui/glass-card";
import { TechPotliLogo } from "@/components/brand/techpotli-logo";

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export default function QuoteApprovePage() {
  const params = useParams();
  const token = String(params.token);
  const [approved, setApproved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleApprove() {
    setLoading(true);
    setError(null);
    try {
      await axios.post(`${baseURL}/quotations/approve/${token}`);
      setApproved(true);
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? String((err.response?.data as { message?: string })?.message ?? "Approval failed")
        : "Approval failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <GlassCard className="max-w-md w-full text-center">
        <TechPotliLogo size="md" className="mx-auto" />
        <h1 className="mt-4 text-2xl font-bold">Quotation approval</h1>

        {approved ? (
          <div className="mt-6 space-y-2">
            <p className="text-lg font-semibold text-green-600">Thank you!</p>
            <p className="text-sm text-muted-foreground">
              Your quotation has been approved. Our team will be in touch shortly.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              By clicking below, you confirm that you accept this quotation and agree to proceed.
            </p>
            {error ? <p className="text-sm text-red-500">{error}</p> : null}
            <button
              type="button"
              onClick={handleApprove}
              disabled={loading}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {loading ? "Approving…" : "Approve quotation"}
            </button>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
