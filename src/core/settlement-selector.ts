/**
 * Core Settlement Selector
 *
 * Deterministically selects the optimal settlement asset from merchant options
 * based on allowed policy, balances, and reserve rules.
 */

import {
  CandidateAsset,
  MerchantRequirementOption,
  SettlementSelectionResult,
  REASON_CODES,
} from "./types"

export type SettlementSelectorInput = {
  merchantOptions: MerchantRequirementOption[]
  candidateAssets: CandidateAsset[] // Assets known/held by agent
  allowedAssetSymbols: string[] // User policy allowed symbols
}

export function selectSettlementAsset(input: SettlementSelectorInput): SettlementSelectionResult {
  const { merchantOptions, candidateAssets, allowedAssetSymbols } = input

  const rejectedCandidates: { symbolOrAddress: string; reason: string }[] = []

  if (!merchantOptions || merchantOptions.length === 0) {
    return {
      rejectedCandidates: [{ symbolOrAddress: "MERCHANT", reason: REASON_CODES.NO_VALID_SETTLEMENT_ASSET }],
    }
  }

  // Normalize allowed symbols to uppercase
  const allowedSet = new Set(allowedAssetSymbols.map(s => s.toUpperCase()))

  // Map candidate assets by normalized contract address (lowercase)
  const assetByAddress = new Map<string, CandidateAsset>()
  for (const asset of candidateAssets) {
    assetByAddress.set(asset.address.toLowerCase(), asset)
  }

  for (const option of merchantOptions) {
    const optAddress = option.assetAddress.toLowerCase()
    const candidate = assetByAddress.get(optAddress)

    // Rule 1 & 2: Asset must be known and registered in system
    if (!candidate) {
      rejectedCandidates.push({
        symbolOrAddress: option.assetAddress,
        reason: "Asset not recognized in agent portfolio",
      })
      continue
    }

    // Rule 3: Asset must be enabled in agent configuration
    if (!candidate.enabled) {
      rejectedCandidates.push({
        symbolOrAddress: candidate.symbol,
        reason: "Asset is disabled for this agent",
      })
      continue
    }

    // Rule 4: User policy must allow asset
    if (!allowedSet.has(candidate.symbol.toUpperCase())) {
      rejectedCandidates.push({
        symbolOrAddress: candidate.symbol,
        reason: REASON_CODES.ASSET_NOT_ALLOWED,
      })
      continue
    }

    // Rule 5: Wallet balance must be sufficient for purchase amount
    if (candidate.walletBalanceRaw < option.amountRaw) {
      rejectedCandidates.push({
        symbolOrAddress: candidate.symbol,
        reason: REASON_CODES.INSUFFICIENT_BALANCE,
      })
      continue
    }

    // Rule 6: Reserve requirement must remain satisfied
    // (balance - amount) >= minimumReserve
    if (candidate.walletBalanceRaw - option.amountRaw < candidate.minimumReserveRaw) {
      rejectedCandidates.push({
        symbolOrAddress: candidate.symbol,
        reason: REASON_CODES.RESERVE_VIOLATION,
      })
      continue
    }

    // Deterministic selection: first valid candidate that satisfies all constraints
    return {
      selected: {
        symbol: candidate.symbol,
        address: candidate.address,
        decimals: candidate.decimals,
        amountRaw: option.amountRaw,
        payTo: option.payTo,
        scheme: option.scheme,
      },
      rejectedCandidates,
    }
  }

  return {
    rejectedCandidates,
  }
}
