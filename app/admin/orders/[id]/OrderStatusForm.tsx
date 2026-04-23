"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PrimaryButton, SecondaryButton, TextInput, Field } from "@/components/admin/ui";

const STATUS_LABELS: Record<string, string> = {
  in_production: "Mark In Production",
  quality_check: "Mark Quality Check",
  shipped: "Mark Shipped",
  delivered: "Mark Delivered",
};

type Props = {
  orderId: string;
  currentStatus: string;
  nextStatus: string | null;
  trackingNumber: string;
  trackingCarrier: string;
  canCancel: boolean;
};

export function OrderStatusForm({
  orderId,
  currentStatus,
  nextStatus,
  trackingNumber: initialTracking,
  trackingCarrier: initialCarrier,
  canCancel,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [trackingNumber, setTrackingNumber] = useState(initialTracking);
  const [trackingCarrier, setTrackingCarrier] = useState(initialCarrier);
  const [error, setError] = useState<string | null>(null);

  const needsTracking = nextStatus === "shipped";

  async function advanceStatus() {
    if (needsTracking && (!trackingNumber.trim() || !trackingCarrier.trim())) {
      setError("Tracking number and carrier are required before marking Shipped.");
      return;
    }
    setError(null);
    const res = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: nextStatus,
        trackingNumber: trackingNumber.trim() || undefined,
        trackingCarrier: trackingCarrier.trim() || undefined,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to update status.");
      return;
    }
    startTransition(() => router.refresh());
  }

  async function cancelOrder() {
    if (!confirm("Cancel this order and issue a full Stripe refund?")) return;
    setError(null);
    const res = await fetch(`/api/admin/orders/${orderId}/cancel`, {
      method: "POST",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Cancellation failed.");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      {needsTracking && (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tracking number" hint="Required before marking Shipped">
            <TextInput
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="1Z999AA10123456784"
            />
          </Field>
          <Field label="Carrier">
            <TextInput
              value={trackingCarrier}
              onChange={(e) => setTrackingCarrier(e.target.value)}
              placeholder="UPS, USPS, FedEx…"
            />
          </Field>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {nextStatus && (
          <PrimaryButton type="button" onClick={advanceStatus} disabled={isPending}>
            {isPending ? "Saving…" : (STATUS_LABELS[nextStatus] ?? `Mark ${nextStatus}`)}
          </PrimaryButton>
        )}

        {canCancel && (
          <SecondaryButton
            type="button"
            onClick={cancelOrder}
            disabled={isPending}
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            Cancel & refund
          </SecondaryButton>
        )}

        {!nextStatus && !canCancel && (
          <p className="text-sm text-zinc-500">No further actions available.</p>
        )}
      </div>
    </div>
  );
}
