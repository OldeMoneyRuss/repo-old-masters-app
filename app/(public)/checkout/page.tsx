"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import type { CartWithItems } from "@/lib/cart";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

const PAPER_LABELS: Record<string, string> = {
  archival_matte: "Premium Matte",
  lustre: "Lustre",
  fine_art_cotton: "Cotton Rag",
};

function fmt(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

type Address = {
  fullName: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  phone: string;
};

type IntentData = {
  clientSecret: string;
  intentId: string;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
};

const labelClass =
  "mb-1.5 block font-sans text-[10px] font-medium uppercase tracking-[0.15em] text-ink-light";

const inputClass =
  "w-full border border-[color:var(--border)] bg-cream px-3.5 py-2.5 font-serif text-base text-ink outline-none focus:border-lapis";

export default function CheckoutPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [cart, setCart] = useState<CartWithItems | null>(null);
  const [loadingCart, setLoadingCart] = useState(true);
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState<Address>({
    fullName: "",
    line1: "",
    line2: "",
    city: "",
    region: "NY",
    postalCode: "",
    country: "US",
    phone: "",
  });
  const [shippingMethod, setShippingMethod] = useState<"standard" | "expedited">(
    "standard",
  );
  const [intentData, setIntentData] = useState<IntentData | null>(null);
  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadCart() {
      try {
        const res = await fetch("/api/cart");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setCart(data.cart ?? data);
      } finally {
        if (!cancelled) setLoadingCart(false);
      }
    }
    loadCart();
    return () => {
      cancelled = true;
    };
  }, []);

  const shippingCostPreview = shippingMethod === "standard" ? 999 : 2499;
  const totalPreview = (cart?.subtotalCents ?? 0) + shippingCostPreview;

  function step1Valid() {
    return (
      email.trim().length > 3 &&
      address.fullName.trim() &&
      address.line1.trim() &&
      address.city.trim() &&
      address.region.trim() &&
      address.postalCode.trim()
    );
  }

  async function loadPaymentIntent() {
    setProcessing(true);
    setPaymentError(null);
    try {
      const res = await fetch("/api/checkout/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shippingMethod }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setPaymentError(err.error ?? "Unable to start checkout");
        setProcessing(false);
        return;
      }
      const data = (await res.json()) as IntentData;
      setIntentData(data);
      setStep(3);
    } catch {
      setPaymentError("Unable to start checkout");
    } finally {
      setProcessing(false);
    }
  }

  function handleSuccess(orderNumber: string) {
    router.push(`/checkout/confirmation/${orderNumber}`);
  }

  if (loadingCart) {
    return (
      <section className="mx-auto max-w-[1080px] px-8 py-12">
        <p className="font-sans text-[11px] uppercase tracking-[0.2em] text-ink-light">
          Loading checkout…
        </p>
      </section>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <section className="mx-auto max-w-[700px] px-8 py-20 text-center">
        <h1 className="mb-3 font-display text-[36px] text-ink">Your cart is empty</h1>
        <p className="mb-8 font-serif text-lg text-ink-light">
          Browse the catalog to find prints to add.
        </p>
        <Link
          href="/catalog"
          className="inline-block bg-venetian px-8 py-3.5 font-sans text-[13px] font-medium uppercase tracking-[0.1em] text-cream transition-colors hover:bg-venetian-dark"
        >
          Browse Catalog
        </Link>
      </section>
    );
  }

  const steps = [
    { n: 1, label: "Shipping" },
    { n: 2, label: "Method" },
    { n: 3, label: "Payment" },
  ];

  return (
    <section className="mx-auto max-w-[1080px] px-8 pb-20 pt-12">
      <p className="mb-2.5 font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-ink-light">
        Secure Checkout
      </p>
      <h1 className="mb-8 font-display text-[44px] font-normal text-ink">Checkout</h1>

      <div className="mb-10 flex flex-wrap items-center gap-1">
        {steps.map((s, i) => {
          const active = step === s.n;
          const done = step > s.n;
          return (
            <div key={s.n} className="flex items-center gap-2">
              <span
                className={[
                  "font-sans text-[11px] uppercase tracking-[0.1em]",
                  active
                    ? "font-semibold text-ink"
                    : done
                      ? "text-gold"
                      : "text-[color:var(--border)]",
                ].join(" ")}
              >
                {done ? "✓ " : ""}
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <span className="px-2 text-xs text-[color:var(--border)]">›</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,1fr)]">
        <div>
          {step === 1 && (
            <div>
              <h2 className="mb-6 font-display text-[28px] text-ink">
                Delivery details
              </h2>
              <div className="flex flex-col gap-4">
                <div>
                  <label className={labelClass}>Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Full name</label>
                  <input
                    type="text"
                    value={address.fullName}
                    onChange={(e) =>
                      setAddress({ ...address, fullName: e.target.value })
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Street address</label>
                  <input
                    type="text"
                    value={address.line1}
                    onChange={(e) =>
                      setAddress({ ...address, line1: e.target.value })
                    }
                    placeholder="123 Main Street"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Apt / Suite (optional)</label>
                  <input
                    type="text"
                    value={address.line2}
                    onChange={(e) =>
                      setAddress({ ...address, line2: e.target.value })
                    }
                    className={inputClass}
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr_1.2fr]">
                  <div>
                    <label className={labelClass}>City</label>
                    <input
                      type="text"
                      value={address.city}
                      onChange={(e) =>
                        setAddress({ ...address, city: e.target.value })
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>State</label>
                    <input
                      type="text"
                      value={address.region}
                      onChange={(e) =>
                        setAddress({ ...address, region: e.target.value })
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>ZIP code</label>
                    <input
                      type="text"
                      value={address.postalCode}
                      onChange={(e) =>
                        setAddress({ ...address, postalCode: e.target.value })
                      }
                      placeholder="10001"
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Phone (optional)</label>
                  <input
                    type="tel"
                    value={address.phone}
                    onChange={(e) =>
                      setAddress({ ...address, phone: e.target.value })
                    }
                    className={inputClass}
                  />
                </div>
                <p className="font-sans text-[11px] tracking-[0.05em] text-ink-light">
                  Country: United States (US). Other destinations coming soon.
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="mb-6 font-display text-[28px] text-ink">
                Shipping method
              </h2>
              <p className="mb-3 font-sans text-[10px] uppercase tracking-[0.15em] text-ink-light">
                All orders: production 3–5 business days before handoff to carrier
              </p>

              {(
                [
                  {
                    key: "standard" as const,
                    label: "Standard",
                    days: "5–8 business days",
                    cents: 999,
                  },
                  {
                    key: "expedited" as const,
                    label: "Expedited",
                    days: "2–3 business days",
                    cents: 2499,
                  },
                ]
              ).map((opt) => {
                const active = shippingMethod === opt.key;
                return (
                  <button
                    type="button"
                    key={opt.key}
                    onClick={() => setShippingMethod(opt.key)}
                    className={[
                      "mb-2 flex w-full items-center justify-between border px-5 py-4 text-left transition-colors",
                      active
                        ? "border-ink bg-ink"
                        : "border-[color:var(--border)] bg-cream",
                    ].join(" ")}
                  >
                    <div>
                      <p
                        className={[
                          "mb-1 font-sans text-[13px] font-medium tracking-[0.06em]",
                          active ? "text-cream" : "text-ink",
                        ].join(" ")}
                      >
                        {opt.label}
                      </p>
                      <p
                        className={[
                          "font-serif text-[15px]",
                          active ? "text-[#C8B89A]" : "text-ink-light",
                        ].join(" ")}
                      >
                        Estimated delivery in {opt.days} after production
                      </p>
                    </div>
                    <p
                      className={[
                        "ml-5 shrink-0 font-display text-[22px] tabular-nums",
                        active ? "text-parchment" : "text-ink",
                      ].join(" ")}
                    >
                      {fmt(opt.cents)}
                    </p>
                  </button>
                );
              })}

              {paymentError && (
                <p className="mt-3 font-serif text-sm text-venetian">{paymentError}</p>
              )}
            </div>
          )}

          {step === 3 && intentData && (
            <div>
              <h2 className="mb-2 font-display text-[28px] text-ink">Payment</h2>
              <p className="mb-6 font-serif text-[15px] text-ink-light">
                All transactions are secured and encrypted via Stripe.
              </p>

              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret: intentData.clientSecret,
                  appearance: { theme: "stripe" },
                }}
              >
                <PaymentForm
                  intentData={intentData}
                  email={email}
                  address={address}
                  shippingMethod={shippingMethod}
                  onSuccess={handleSuccess}
                />
              </Elements>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s === 3 ? 2 : 1))}
                className="font-sans text-[11px] uppercase tracking-[0.1em] text-ink-light underline hover:text-ink"
              >
                ← Back
              </button>
            ) : (
              <Link
                href="/cart"
                className="font-sans text-[11px] uppercase tracking-[0.1em] text-ink-light underline hover:text-ink"
              >
                ← Return to cart
              </Link>
            )}

            {step === 1 && (
              <button
                type="button"
                disabled={!step1Valid()}
                onClick={() => setStep(2)}
                className="bg-venetian px-7 py-3 font-sans text-[13px] font-medium uppercase tracking-[0.1em] text-cream transition-colors hover:bg-venetian-dark disabled:opacity-40"
              >
                Continue →
              </button>
            )}
            {step === 2 && (
              <button
                type="button"
                disabled={processing}
                onClick={loadPaymentIntent}
                className="bg-venetian px-7 py-3 font-sans text-[13px] font-medium uppercase tracking-[0.1em] text-cream transition-colors hover:bg-venetian-dark disabled:opacity-40"
              >
                {processing ? "Preparing…" : "Continue to payment →"}
              </button>
            )}
          </div>
        </div>

        <aside className="sticky top-20 min-w-[260px] border border-[color:var(--border-light)] bg-cream p-6">
          <p className="mb-3.5 font-sans text-[10px] uppercase tracking-[0.18em] text-ink-light">
            Order Summary
          </p>
          <ul className="mb-4 flex flex-col gap-3">
            {cart.items.map((item) => (
              <li key={item.id} className="flex items-center gap-3">
                <div className="h-[60px] w-12 shrink-0 overflow-hidden bg-[color:var(--parchment-mid)]" />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[15px] leading-[1.2] text-ink">
                    {item.artworkTitle}
                  </p>
                  <p className="font-sans text-[10px] tracking-[0.06em] text-ink-light">
                    {item.printSize} ·{" "}
                    {PAPER_LABELS[item.paperType] ?? item.paperType} · qty{" "}
                    {item.quantity}
                  </p>
                </div>
                <p className="shrink-0 font-display text-[17px] text-ink tabular-nums">
                  {fmt(item.lineTotalCents)}
                </p>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-1.5 border-t border-[color:var(--border-light)] pt-3">
            <div className="flex justify-between font-serif text-[15px]">
              <span className="text-ink-light">Subtotal</span>
              <span className="text-ink-mid tabular-nums">
                {fmt(intentData?.subtotalCents ?? cart.subtotalCents)}
              </span>
            </div>
            <div className="flex justify-between font-serif text-[15px]">
              <span className="text-ink-light">Shipping</span>
              <span className="text-ink-mid tabular-nums">
                {step >= 2
                  ? fmt(intentData?.shippingCents ?? shippingCostPreview)
                  : "—"}
              </span>
            </div>
            <div className="mt-1 flex justify-between border-t border-[color:var(--border-light)] pt-2.5">
              <span className="font-sans text-[11px] uppercase tracking-[0.1em] text-ink">
                Total
              </span>
              <span className="font-display text-[22px] text-ink tabular-nums">
                {fmt(
                  intentData?.totalCents ??
                    (step >= 2 ? totalPreview : cart.subtotalCents),
                )}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function PaymentForm({
  intentData,
  email,
  address,
  shippingMethod,
  onSuccess,
}: {
  intentData: IntentData;
  email: string;
  address: Address;
  shippingMethod: "standard" | "expedited";
  onSuccess: (orderNumber: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setError(null);

    const { error: stripeErr } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + "/checkout/confirmation/pending",
      },
      redirect: "if_required",
    });

    if (stripeErr) {
      setError(stripeErr.message ?? "Payment failed");
      setProcessing(false);
      return;
    }

    const res = await fetch("/api/checkout/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentIntentId: intentData.intentId,
        email,
        shippingAddress: {
          fullName: address.fullName,
          line1: address.line1,
          line2: address.line2 || undefined,
          city: address.city,
          region: address.region,
          postalCode: address.postalCode,
          country: address.country,
          phone: address.phone || undefined,
        },
        shippingMethod,
      }),
    });

    if (!res.ok) {
      setError("Order creation failed. Please contact support.");
      setProcessing(false);
      return;
    }

    const { orderNumber } = await res.json();
    onSuccess(orderNumber);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement />
      {error && <p className="font-serif text-sm text-venetian">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full bg-venetian px-6 py-3.5 font-sans text-[13px] font-medium uppercase tracking-[0.15em] text-cream transition-colors hover:bg-venetian-dark disabled:opacity-40"
      >
        {processing ? "Processing…" : `Pay ${fmt(intentData.totalCents)}`}
      </button>
      <p className="text-center font-sans text-[10px] tracking-[0.08em] text-ink-light">
        🔒 Secured by Stripe · No card data stored on our servers
      </p>
    </form>
  );
}
