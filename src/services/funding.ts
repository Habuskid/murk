import {
  decodeEventLog,
  parseAbi,
  type Address,
  type Log,
} from "viem"

export const ERC20_TRANSFER_ABI = parseAbi([
  "event Transfer(address indexed from, address indexed to, uint256 value)",
])

export function hasExactErc20Transfer(input: {
  logs: readonly Pick<Log, "address" | "data" | "topics">[]
  tokenAddress: Address
  expectedFrom: Address
  expectedTo: Address
  expectedAmount: bigint
}): boolean {
  const token = input.tokenAddress.toLowerCase()
  const from = input.expectedFrom.toLowerCase()
  const to = input.expectedTo.toLowerCase()

  for (const log of input.logs) {
    if (log.address.toLowerCase() !== token) continue

    try {
      const decoded = decodeEventLog({
        abi: ERC20_TRANSFER_ABI,
        data: log.data,
        topics: log.topics,
      })

      if (decoded.eventName !== "Transfer") continue

      if (
        decoded.args.from.toLowerCase() === from &&
        decoded.args.to.toLowerCase() === to &&
        decoded.args.value === input.expectedAmount
      ) {
        return true
      }
    } catch {
      continue
    }
  }

  return false
}
