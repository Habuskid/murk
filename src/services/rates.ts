/**
 * Rates Service
 * Fetches, normalizes, and validates exchange rates for all 8 MVP currencies.
 * Uses exact rational integer arithmetic.
 */

import { RateQuote } from "../core/types"
import { decimalToFraction, validateRateQuote } from "../../spikes/spike-e-rate-provider"

// In-memory short cache to avoid redundant network roundtrips during an orchestration cycle
let cachedQuotes: Map<string, RateQuote> = new Map()

export async function getRateQuote(
  quoteCurrency: string,
  baseAsset: string = "USD"
): Promise<RateQuote> {
  const normQuote = quoteCurrency.toUpperCase()
  const cacheKey = `${baseAsset.toUpperCase()}_${normQuote}`
  const existing = cachedQuotes.get(cacheKey)

  if (existing && validateRateQuote(existing, 10 * 60 * 1000)) {
    return existing
  }

  const url = process.env.EXCHANGE_RATE_API_URL || "https://open.er-api.com/v6/latest/USD"
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch exchange rate quote: ${response.status} ${response.statusText}`)
  }

  const data = (await response.json()) as {
    result: string
    time_last_update_utc: string
    time_next_update_utc: string
    rates: Record<string, number>
  }

  if (data.result !== "success" || !data.rates) {
    throw new Error(`Invalid response structure from rate provider: ${JSON.stringify(data)}`)
  }

  const rawRate = data.rates[normQuote]
  if (rawRate === undefined || rawRate === null) {
    throw new Error(`Rate not available for currency pair ${baseAsset}/${normQuote}`)
  }

  const { numerator, denominator } = decimalToFraction(rawRate)
  const timestamp = new Date(data.time_last_update_utc)
  const expiresAt = new Date(data.time_next_update_utc || Date.now() + 24 * 60 * 60 * 1000)

  const quote: RateQuote = {
    baseAsset,
    quoteCurrency: normQuote,
    rateNumerator: numerator,
    rateDenominator: denominator,
    kind: "REFERENCE_FX",
    source: "open.er-api.com",
    timestamp,
    expiresAt,
  }

  if (!validateRateQuote(quote)) {
    throw new Error(`Fetched rate quote for ${baseAsset}/${normQuote} failed validation (stale or non-positive)`)
  }

  cachedQuotes.set(cacheKey, quote)
  return quote
}
