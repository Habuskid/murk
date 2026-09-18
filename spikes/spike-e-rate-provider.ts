/**
 * Spike E: Rate Provider Verification
 *
 * Verifies fetching live reference FX quotes for MVP currencies and converting
 * them into exact deterministic rational representation (rateNumerator / rateDenominator as bigints).
 * Never uses floating-point math for financial operations.
 */

export type RateKind = "EXECUTABLE_ONCHAIN" | "REFERENCE_FX" | "PEG_REFERENCE"

export type RateQuote = {
  baseAsset: string
  quoteCurrency: string
  rateNumerator: bigint
  rateDenominator: bigint
  kind: RateKind
  source: string
  timestamp: Date
  expiresAt: Date
}

export const MVP_CURRENCIES = [
  "NGN",
  "KES",
  "BRL",
  "MXN",
  "COP",
  "AED",
  "SAR",
  "INR",
] as const

export type MvpCurrency = typeof MVP_CURRENCIES[number]

/**
 * Converts a decimal string or number (e.g. "1330.266485") into an exact integer fraction.
 * For example, "1330.266485" -> numerator: 1330266485n, denominator: 1000000n.
 */
export function decimalToFraction(decimalStr: string | number): {
  numerator: bigint
  denominator: bigint
} {
  const str = typeof decimalStr === "number" ? decimalStr.toString() : decimalStr.trim()
  if (!str || isNaN(Number(str))) {
    throw new Error(`Invalid decimal value for rate conversion: "${str}"`)
  }

  const parts = str.split(".")
  const integerPart = parts[0]
  const fractionalPart = parts[1] || ""

  const scale = fractionalPart.length
  let denominator = 1n
  for (let i = 0; i < scale; i++) {
    denominator *= 10n
  }
  const numerator = BigInt(integerPart) * denominator + (fractionalPart ? BigInt(fractionalPart) : 0n)

  if (numerator <= 0n) {
    throw new Error(`Rate must be strictly positive, got ${numerator}/${denominator}`)
  }

  return { numerator, denominator }
}

/**
 * Fetches real-time reference rates from open exchange API.
 */
export async function fetchLiveRates(baseAsset: string = "USD"): Promise<RateQuote[]> {
  const url = process.env.EXCHANGE_RATE_API_URL || "https://open.er-api.com/v6/latest/USD"
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch live rates from ${url}: ${response.status} ${response.statusText}`)
  }

  const data = (await response.json()) as {
    result: string
    time_last_update_utc: string
    time_next_update_utc: string
    rates: Record<string, number>
  }

  if (data.result !== "success" || !data.rates) {
    throw new Error(`Invalid response format from rate provider: ${JSON.stringify(data)}`)
  }

  const timestamp = new Date(data.time_last_update_utc)
  const expiresAt = new Date(data.time_next_update_utc || Date.now() + 24 * 60 * 60 * 1000)

  const quotes: RateQuote[] = []

  for (const currency of MVP_CURRENCIES) {
    const rawRate = data.rates[currency]
    if (rawRate === undefined || rawRate === null) {
      throw new Error(`Missing rate for required MVP currency: ${currency}`)
    }

    const { numerator, denominator } = decimalToFraction(rawRate)

    quotes.push({
      baseAsset,
      quoteCurrency: currency,
      rateNumerator: numerator,
      rateDenominator: denominator,
      kind: "REFERENCE_FX",
      source: "open.er-api.com",
      timestamp,
      expiresAt,
    })
  }

  return quotes
}

/**
 * Validates that a quote is fresh and mathematically sound.
 */
export function validateRateQuote(quote: RateQuote, maxAgeMs: number = 36 * 60 * 60 * 1000): boolean {
  if (quote.rateNumerator <= 0n || quote.rateDenominator <= 0n) {
    return false
  }
  const now = Date.now()
  if (now > quote.expiresAt.getTime()) {
    return false
  }
  if (now - quote.timestamp.getTime() > maxAgeMs) {
    return false
  }
  return true
}

export async function runSpikeE(): Promise<{ success: boolean; quotes: RateQuote[]; error?: string }> {
  console.log("=== SPIKE E: Rate Provider Verification ===")
  try {
    const quotes = await fetchLiveRates("USD")
    console.log(`Successfully fetched and normalized ${quotes.length} MVP currency quotes:`)
    for (const q of quotes) {
      const isValid = validateRateQuote(q)
      const approx = (Number(q.rateNumerator) / Number(q.rateDenominator)).toFixed(4)
      console.log(` - 1 ${q.baseAsset} = ~${approx} ${q.quoteCurrency} (${q.rateNumerator}/${q.rateDenominator}) [Valid: ${isValid}]`)
    }

    if (quotes.length !== MVP_CURRENCIES.length) {
      throw new Error(
        `Expected ${MVP_CURRENCIES.length} locked accounting currencies, got ${quotes.length}`
      )
    }

    for (const currency of MVP_CURRENCIES) {
      const quote = quotes.find(q => q.quoteCurrency === currency)
      if (!quote) {
        throw new Error(`Missing required quote for ${currency}`)
      }
      if (!validateRateQuote(quote)) {
        throw new Error(`Live quote failed freshness/math validation for ${currency}`)
      }
    }

    const staleQuote: RateQuote = {
      ...quotes[0],
      timestamp: new Date(Date.now() - 72 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
    }

    if (validateRateQuote(staleQuote)) {
      throw new Error("Stale rate was incorrectly accepted")
    }

    console.log("Verified all locked currencies and stale-rate fail-closed behavior.")
    console.log("SPIKE E RESULT: PASSED\n")
    return { success: true, quotes }
  } catch (err: any) {
    console.error("SPIKE E RESULT: FAILED -", err.message)
    return { success: false, quotes: [], error: err.message }
  }
}

// Allow direct execution
if (process.argv[1]?.includes("spike-e-rate-provider")) {
  runSpikeE()
    .then((result) => {
      if (!result.success) process.exitCode = 1
    })
    .catch((error) => {
      console.error(error)
      process.exitCode = 1
    })
}
