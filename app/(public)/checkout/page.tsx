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
  const [shippingMethod, setShippingMethod] = useState<
    "standard" | "expedited"
  >("standard");
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

  const shippingCostPreview =
    shippingMethod === "standard" ? 999 : 2499;
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
      <section className="mx-auto max-w-5xl px-6 py-12">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Loading checkout…
        </p>
      </section>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <section className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="font-serif text-3xl text-zinc-900 dark:text-zinc-50">
          Your cart is empty
        </h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          Browse the catalog to find prints to add.
        </p>
        <Link
          href="/catalog"
          className="mt-6 inline-flex rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
        >
          Browse catalog
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="font-serif text-3xl text-zinc-900 dark:text-zinc-50">
        Checkout
      </h1>

      <ol className="mt-8 flex items-center gap-4 text-sm">
        {[
          { n: 1, label: "Shipping" },
          { n: 2, label: "Method" },
          { n: 3, label: "Payment" },
        ].map((s, i) => {
          const active = step === s.n;
          const done = step > s.n;
          return (
            <li key={s.n} className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-medium ${
                    active
                      ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                      : done
                        ? "border-zinc-400 bg-zinc-200 text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                        : "border-zinc-300 text-zinc-500 dark:border-zinc-700 dark:text-zinc-500"
                  }`}
                >
                  {s.n}
                </span>
                <span
                  className={
                    active
                      ? "text-zinc-900 dark:text-zinc-50"
                      : "text-zinc-500 dark:text-zinc-500"
                  }
                >
                  {s.label}
                </span>
              </div>
              {i < 2 && (
                <span className="h-px w-10 bg-zinc-200 dark:bg-zinc-800" />
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="font-serif text-xl text-zinc-900 dark:text-zinc-50">
                Contact &amp; Shipping
              </h2>

              <div>
                <label className="mb-1 block text-sm text-zinc-700 dark:text-zinc-300">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-zinc-700 dark:text-zinc-300">
                  Full name
                </label>
                <input
                  type="text"
                  value={address.fullName}
                  onChange={(e) =>
                    setAddress({ ...address, fullName: e.target.value })
                  }
                  className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-zinc-700 dark:text-zinc-300">
                  Address line 1
                </label>
                <input
                  type="text"
                  value={address.line1}
                  onChange={(e) =>
                    setAddress({ ...address, line1: e.target.value })
                  }
                  className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-zinc-700 dark:text-zinc-300">
                  Address line 2{" "}
                  <span className="text-zinc-500">(optional)</span>
                </label>
                <input
                  type="text"
                  value={address.line2}
                  onChange={(e) =>
                    setAddress({ ...address, line2: e.target.value })
                  }
                  className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm text-zinc-700 dark:text-zinc-300">
                    City
                  </label>
                  <input
                    type="text"
                    value={address.city}
                    onChange={(e) =>
                      setAddress({ ...address, city: e.target.value })
                    }
                    className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-zinc-700 dark:text-zinc-300">
                    State / Region
                  </label>
                  <input
                    type="text"
                    value={address.region}
                    onChange={(e) =>
                      setAddress({ ...address, region: e.target.value })
                    }
                    className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-zinc-700 dark:text-zinc-300">
                    Postal code
                  </label>
                  <input
                    type="text"
                    value={address.postalCode}
                    onChange={(e) =>
                      setAddress({ ...address, postalCode: e.target.value })
                    }
                    className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm text-zinc-700 dark:text-zinc-300">
                  Phone <span className="text-zinc-500">(optional)</span>
                </label>
                <input
                  type="tel"
                  value={address.phone}
                  onChange={(e) =>
                    setAddress({ ...address, phone: e.target.value })
                  }
                  className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>

              <p className="text-xs text-zinc-500 dark:text-zinc-500">
                Country: United States (US). Other destinations coming soon.
              </p>

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={!step1Valid()}
                  onClick={() => setStep(2)}
                  className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900"
                >
                  Continue to shipping method
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="font-serif text-xl text-zinc-900 dark:text-zinc-50">
                Shipping method
              </h2>

              <div className="space-y-3">
                <label
                  className={`flex cursor-pointer items-start justify-between rounded border px-4 py-4 text-sm ${
                    shippingMethod === "standard"
                      ? "border-zinc-900 dark:border-zinc-50"
                      : "border-zinc-300 dark:border-zinc-700"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="shipping"
                      checked={shippingMethod === "standard"}
                      onChange={() => setShippingMethod("standard")}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium text-zinc-900 dark:text-zinc-50">
                        Standard
                      </div>
                      <div className="text-xs text-zinc-600 dark:text-zinc-400">
                        5–8 business days
                      </div>
                    </div>
                  </div>
                  <div className="font-medium text-zinc-900 dark:text-zinc-50">
                    {fmt(999)}
                  </div>
                </label>

                <label
                  className={`flex cursor-pointer items-start justify-between rounded border px-4 py-4 text-sm ${
                    shippingMethod === "expedited"
                      ? "border-zinc-900 dark:border-zinc-50"
                      : "border-zinc-300 dark:border-zinc-700"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="shipping"
                      checked={shippingMethod === "expedited"}
                      onChange={() => setShippingMethod("expedited")}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium text-zinc-900 dark:text-zinc-50">
                        Expedited
                      </div>
                      <div className="text-xs text-zinc-600 dark:text-zinc-400">
                        2–3 business days
                      </div>
                    </div>
                  </div>
                  <div className="font-medium text-zinc-900 dark:text-zinc-50">
                    {fmt(2499)}
                  </div>
                </label>
              </div>

              {paymentError && (
                <p className="text-sm text-red-600">{paymentError}</p>
              )}

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  disabled={processing}
                  onClick={loadPaymentIntent}
                  className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900"
                >
                  {processing ? "Preparing…" : "Continue to payment"}
                </button>
              </div>
            </div>
          )}

          {step === 3 && intentData && (
            <div className="space-y-6">
              <h2 className="font-serif text-xl text-zinc-900 dark:text-zinc-50">
                Payment
              </h2>

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

              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
              >
                ← Back to shipping method
              </button>
            </div>
          )}
        </div>

        <aside className="lg:col-span-1">
          <div className="rounded border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="font-serif text-lg text-zinc-900 dark:text-zinc-50">
              Order summary
            </h3>

            <ul className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800">
              {cart.items.map((item) => (
                <li key={item.id} className="py-3 text-sm">
                  <div className="font-medium text-zinc-900 dark:text-zinc-50">
                    {item.artworkTitle}
                  </div>
                  {item.artistName && (
                    <div className="text-xs text-zinc-500 dark:text-zinc-500">
                      {item.artistName}
                    </div>
                  )}
                  <div className="mt-1 flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
                    <span>
                      {item.printSize} ·{" "}
                      {PAPER_LABELS[item.paperType] ?? item.paperType} · qty{" "}
                      {item.quantity}
                    </span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-50">
                      {fmt(item.lineTotalCents)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            <dl className="mt-5 space-y-2 border-t border-zinc-200 pt-4 text-sm dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <dt className="text-zinc-600 dark:text-zinc-400">Subtotal</dt>
                <dd className="text-zinc-900 dark:text-zinc-50">
                  {fmt(
                    intentData?.subtotalCents ?? cart.subtotalCents,
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-zinc-600 dark:text-zinc-400">Shipping</dt>
                <dd className="text-zinc-900 dark:text-zinc-50">
                  {step >= 2
                    ? fmt(intentData?.shippingCents ?? shippingCostPreview)
                    : "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between border-t border-zinc-200 pt-3 font-medium dark:border-zinc-800">
                <dt className="text-zinc-900 dark:text-zinc-50">Total</dt>
                <dd className="text-zinc-900 dark:text-zinc-50">
                  {fmt(
                    intentData?.totalCents ??
                      (step >= 2 ? totalPreview : cart.subtotalCents),
                  )}
                </dd>
              </div>
            </dl>
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full rounded-full bg-zinc-900 py-3 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {processing ? "Processing…" : `Pay ${fmt(intentData.totalCents)}`}
      </button>
    </form>
  );
}
