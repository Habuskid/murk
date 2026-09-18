/**
 * Core Money Math & Currency Conversions
 *
 * Rules:
 * - NEVER use floating-point arithmetic for financial operations.
 * - Always use integer amounts with explicit decimals.
 * - Accounting values use integer minor units (e.g. kobo for NGN, cents for USD/AED/BRL).
 * - Exact rational arithmetic with integer bigint division and deterministic ceil rounding.
 */

import { Money, RateQuote } from "./types"

/**
 * Standard minor unit decimals for supported accounting currencies.
 * Default is 2 (e.g. 100 kobo = 1 NGN).
 */
export const CURRENCY_MINOR_DECIMALS: Record<string, number> = {
  NGN: 2, // Kobo
  KES: 2, // Cents
  BRL: 2, // Centavos
  MXN: 2, // Centavos
  COP: 2, // Centavos
  AED: 2, // Fils
  SAR: 2, // Halalas
  INR: 2, // Paise
  USD: 2, // Cents
  USDC: 6,
  USDT: 6,
}

export function getMinorUnitDecimals(currency: string): number {
  return CURRENCY_MINOR_DECIMALS[currency.toUpperCase()] ?? 2
}

/**
 * Creates a Money object safely.
 */
export function createMoney(amount: bigint, currency: string, decimals?: number): Money {
  const dec = decimals ?? getMinorUnitDecimals(currency)
  return {
    amount,
    currency: currency.toUpperCase(),
    decimals: dec,
  }
}

export function pow10(decimals: number): bigint {
  let res = 1n
  for (let i = 0; i < decimals; i++) {
    res *= 10n
  }
  return res
}

/**
 * Converts a raw settlement token amount to accounting currency minor units.
 * Formula:
 *   accountingMinor = ceil( (rawAmount * rateNumerator * 10^accountingDecimals) / (rateDenominator * 10^assetDecimals) )
 *
 * Uses ceiling division to ensure financial conservative safety (never under-budgeting spend).
 */
export function convertAssetToAccountingMinor(
  rawAmount: bigint,
  assetDecimals: number,
  quote: RateQuote,
  accountingDecimals: number = 2
): bigint {
  if (rawAmount < 0n) {
    throw new Error(`Raw amount cannot be negative: ${rawAmount}`)
  }
  if (rawAmount === 0n) {
    return 0n
  }
  if (quote.rateNumerator <= 0n || quote.rateDenominator <= 0n) {
    throw new Error(`Invalid non-positive rate quote: ${quote.rateNumerator}/${quote.rateDenominator}`)
  }

  const assetScale = pow10(assetDecimals)
  const accountingScale = pow10(accountingDecimals)

  // Numerator = rawAmount * rateNumerator * accountingScale
  const numerator = rawAmount * quote.rateNumerator * accountingScale

  // Denominator = rateDenominator * assetScale
  const denominator = quote.rateDenominator * assetScale

  // Ceiling integer division: (numerator + denominator - 1n) / denominator
  const minorAmount = (numerator + denominator - 1n) / denominator

  return minorAmount
}

/**
 * Formats a minor-unit bigint into a human-readable string.
 * Example: 500000n (NGN kobo, decimals=2) -> "5,000.00"
 */
export function formatMoneyMinor(minorAmount: bigint, decimals: number = 2): string {
  const isNegative = minorAmount < 0n
  const absAmount = isNegative ? -minorAmount : minorAmount

  const scale = pow10(decimals)
  const integerPart = absAmount / scale
  const remainder = absAmount % scale

  const remStr = remainder.toString().padStart(decimals, "0")
  const intFormatted = integerPart.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")

  const sign = isNegative ? "-" : ""
  if (decimals === 0) {
    return `${sign}${intFormatted}`
  }
  return `${sign}${intFormatted}.${remStr}`
}

/**
 * Formats a Money instance with currency symbol / code.
 */
export function formatMoney(money: Money): string {
  return `${money.currency} ${formatMoneyMinor(money.amount, money.decimals)}`
}
