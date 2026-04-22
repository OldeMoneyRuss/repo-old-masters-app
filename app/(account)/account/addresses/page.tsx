import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { addresses } from "@/db/schema";
import { auth } from "@/lib/auth";
import {
  addAddressAction,
  deleteAddressAction,
  setDefaultShippingAction,
} from "@/lib/account/actions";

export const dynamic = "force-dynamic";

export default async function AddressesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/account/addresses");
  const userId = session.user.id;

  const rows = await db
    .select()
    .from(addresses)
    .where(eq(addresses.userId, userId))
    .orderBy(desc(addresses.isDefaultShipping), desc(addresses.createdAt));

  return (
    <div>
      <h1 className="font-serif text-2xl text-zinc-900 dark:text-zinc-50">
        Saved addresses
      </h1>

      {error ? (
        <p className="mt-4 text-sm text-red-600">
          Something went wrong. Please check your input and try again.
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          You haven&apos;t saved any addresses yet.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {rows.map((addr) => (
            <li
              key={addr.id}
              className="flex flex-col gap-3 rounded border border-zinc-200 p-4 dark:border-zinc-800 sm:flex-row sm:items-start sm:justify-between"
            >
              <address className="not-italic text-sm text-zinc-700 dark:text-zinc-300">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    {addr.fullName}
                  </span>
                  {addr.isDefaultShipping ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-950 dark:text-green-300">
                      Default shipping
                    </span>
                  ) : null}
                </div>
                <div>{addr.line1}</div>
                {addr.line2 ? <div>{addr.line2}</div> : null}
                <div>
                  {addr.city}
                  {addr.region ? `, ${addr.region}` : ""} {addr.postalCode}
                </div>
                <div>{addr.country}</div>
                {addr.phone ? (
                  <div className="mt-1 text-zinc-600 dark:text-zinc-400">
                    {addr.phone}
                  </div>
                ) : null}
              </address>
              <div className="flex flex-wrap gap-2">
                {!addr.isDefaultShipping ? (
                  <form action={setDefaultShippingAction}>
                    <input type="hidden" name="addressId" value={addr.id} />
                    <button
                      type="submit"
                      className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm dark:border-zinc-700"
                    >
                      Set as default
                    </button>
                  </form>
                ) : null}
                <form action={deleteAddressAction}>
                  <input type="hidden" name="addressId" value={addr.id} />
                  <button
                    type="submit"
                    className="rounded-full border border-red-300 px-4 py-1.5 text-sm text-red-600 dark:border-red-800 dark:text-red-400"
                  >
                    Delete
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-10 border-t border-zinc-200 pt-8 dark:border-zinc-800">
        <h2 className="font-serif text-xl text-zinc-900 dark:text-zinc-50">
          Add a new address
        </h2>
        <form
          action={addAddressAction}
          className="mt-4 grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-zinc-700 dark:text-zinc-300">Full name</span>
            <input
              type="text"
              name="fullName"
              required
              maxLength={160}
              autoComplete="name"
              className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-zinc-700 dark:text-zinc-300">
              Address line 1
            </span>
            <input
              type="text"
              name="line1"
              required
              maxLength={200}
              autoComplete="address-line1"
              className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-zinc-700 dark:text-zinc-300">
              Address line 2 (optional)
            </span>
            <input
              type="text"
              name="line2"
              maxLength={200}
              autoComplete="address-line2"
              className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-700 dark:text-zinc-300">City</span>
            <input
              type="text"
              name="city"
              required
              maxLength={120}
              autoComplete="address-level2"
              className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-700 dark:text-zinc-300">
              State / Region (optional)
            </span>
            <input
              type="text"
              name="region"
              maxLength={120}
              autoComplete="address-level1"
              className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-700 dark:text-zinc-300">
              Postal code
            </span>
            <input
              type="text"
              name="postalCode"
              required
              maxLength={40}
              autoComplete="postal-code"
              className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-700 dark:text-zinc-300">
              Country (2-letter code)
            </span>
            <input
              type="text"
              name="country"
              required
              minLength={2}
              maxLength={2}
              placeholder="US"
              autoComplete="country"
              className="rounded border border-zinc-300 bg-white px-3 py-2 uppercase dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-zinc-700 dark:text-zinc-300">
              Phone (optional)
            </span>
            <input
              type="tel"
              name="phone"
              maxLength={40}
              autoComplete="tel"
              className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              name="isDefaultShipping"
              className="rounded border-zinc-300 dark:border-zinc-700"
            />
            <span className="text-zinc-700 dark:text-zinc-300">
              Set as default shipping address
            </span>
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
            >
              Add address
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
