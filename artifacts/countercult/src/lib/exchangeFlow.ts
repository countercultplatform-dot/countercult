export type ExchangeComposerMode = "standard" | "campaign";

export function getExchangeComposerPrefill(mode: ExchangeComposerMode) {
  return {
    exchangeResidency: mode === "campaign",
  };
}