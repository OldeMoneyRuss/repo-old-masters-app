"use client";

import { useState } from "react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <p className="font-sans text-sm tracking-[0.1em] text-gold">
        Thank you — we&rsquo;ll be in touch.
      </p>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
      className="mx-auto flex max-w-[440px] flex-wrap justify-center"
    >
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        className="min-w-0 flex-[1_1_240px] border border-ink-mid bg-[#1E1508] px-4 py-3.5 font-serif text-base text-parchment outline-none placeholder:text-ink-light"
      />
      <button
        type="submit"
        className="bg-venetian px-7 py-3.5 font-sans text-xs font-medium uppercase tracking-[0.1em] text-cream transition-colors hover:bg-venetian-dark"
      >
        Subscribe
      </button>
    </form>
  );
}
