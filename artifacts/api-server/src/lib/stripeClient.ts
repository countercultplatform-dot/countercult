import { ReplitConnectors } from "@replit/connectors-sdk";

const connectors = new ReplitConnectors();
let patronPostConnectionId: string | undefined;
let patronPostConnectionPromise: Promise<string | undefined> | undefined;

async function getStripeConnectionId(): Promise<string | undefined> {
  if (patronPostConnectionId) return patronPostConnectionId;
  if (!patronPostConnectionPromise) {
    patronPostConnectionPromise = (async () => {
      const connections = await connectors.listConnections({ connector_names: "stripe" });
      if (connections.length <= 1) return connections[0]?.id;

      const membershipPriceId = process.env.PATRON_POST_MEMBERSHIP_PRICE_ID;
      if (!membershipPriceId) {
        throw new Error("Patron Post membership price is not configured.");
      }
      for (const connection of connections) {
        const response = await connectors.proxy(
          "stripe",
          `/v1/prices/${encodeURIComponent(membershipPriceId)}`,
          { method: "GET", connectionId: connection.id },
        );
        if (!response.ok) continue;
        const price = await response.json().catch(() => null) as { id?: string } | null;
        if (price?.id === membershipPriceId) return connection.id;
      }
      throw new Error("The configured Patron Post price was not found in a connected Stripe account.");
    })();
  }
  try {
    patronPostConnectionId = await patronPostConnectionPromise;
    return patronPostConnectionId;
  } catch (error) {
    patronPostConnectionPromise = undefined;
    throw error;
  }
}

export async function stripeRequest<T>(
  path: string,
  method: "GET" | "POST" = "GET",
  fields?: Record<string, string>,
  apiVersion?: string,
): Promise<T> {
  const connectionId = await getStripeConnectionId();
  const response = await connectors.proxy("stripe", path, {
    method,
    headers: {
      ...(fields ? { "Content-Type": "application/x-www-form-urlencoded" } : { Accept: "application/json" }),
      ...(apiVersion ? { "Stripe-Version": apiVersion } : {}),
    },
    ...(connectionId ? { connectionId } : {}),
    ...(fields ? { body: new URLSearchParams(fields).toString() } : {}),
  });
  const payload = await response.json().catch(() => ({})) as T & { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(payload.error?.message || `Stripe request failed (${response.status}).`);
  }
  return payload;
}
