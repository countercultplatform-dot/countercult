export function expectedStripeLivemode(environment = process.env.NODE_ENV): boolean {
  return environment === "production";
}

export function assertStripeMode(
  livemode: boolean,
  resource: string,
  environment = process.env.NODE_ENV,
): void {
  const expectedLivemode = expectedStripeLivemode(environment);
  if (livemode !== expectedLivemode) {
    const mode = expectedLivemode ? "live" : "test";
    throw new Error(`Patron Post ${mode} checkout requires a matching Stripe ${mode}-mode ${resource}.`);
  }
}
