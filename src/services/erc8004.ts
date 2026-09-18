import {
  decodeEventLog,
  encodeFunctionData,
  parseAbi,
  type Address,
  type Hex,
} from "viem"
import { getCeloClient } from "./celo"
import { appendMurkAttribution, verifyMurkAttribution } from "./attribution"
import { resolveAgentViemAccount } from "./agent-wallet"

export const CELO_ERC8004_IDENTITY_REGISTRY =
  "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as const

export const ERC8004_IDENTITY_ABI = parseAbi([
  "function register() returns (uint256 agentId)",
  "function register(string agentURI) returns (uint256 agentId)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function getAgentWallet(uint256 agentId) view returns (address)",
  "function setAgentWallet(uint256 agentId, address newWallet, uint256 deadline, bytes signature)",
  "event Registered(uint256 indexed agentId, string agentURI, address indexed owner)",
])

export type Erc8004Status = {
  registered: boolean
  agentId: string | null
  owner: Address | null
  registeredWallet: Address | null
  expectedOwner: Address
  expectedAgentWallet: Address
  ownerMatches: boolean
  walletBound: boolean
}

export function buildRegisterTransaction(agentURI: string): {
  to: Address
  data: Hex
} {
  const data = encodeFunctionData({
    abi: ERC8004_IDENTITY_ABI,
    functionName: "register",
    args: [agentURI],
  })

  return {
    to: CELO_ERC8004_IDENTITY_REGISTRY,
    data: appendMurkAttribution(data),
  }
}

export async function parseRegisteredAgent(input: {
  txHash: Hex
  expectedOwner: Address
  expectedAgentURI: string
}): Promise<{
  agentId: bigint
  owner: Address
  agentURI: string
  blockNumber: bigint
  attribution: Awaited<ReturnType<typeof verifyMurkAttribution>>
}> {
  const client = getCeloClient()
  const [receipt, transaction] = await Promise.all([
    client.getTransactionReceipt({ hash: input.txHash }),
    client.getTransaction({ hash: input.txHash }),
  ])

  if (receipt.status !== "success") {
    throw new Error("ERC8004_REGISTRATION_REVERTED")
  }

  if (
    transaction.from.toLowerCase() !== input.expectedOwner.toLowerCase() ||
    transaction.to?.toLowerCase() !==
      CELO_ERC8004_IDENTITY_REGISTRY.toLowerCase()
  ) {
    throw new Error("ERC8004_REGISTRATION_TX_MISMATCH")
  }

  for (const log of receipt.logs) {
    if (
      log.address.toLowerCase() !==
      CELO_ERC8004_IDENTITY_REGISTRY.toLowerCase()
    ) {
      continue
    }

    try {
      const decoded = decodeEventLog({
        abi: ERC8004_IDENTITY_ABI,
        data: log.data,
        topics: log.topics,
      })

      if (decoded.eventName !== "Registered") continue

      const owner = decoded.args.owner
      if (owner.toLowerCase() !== input.expectedOwner.toLowerCase()) {
        throw new Error("ERC8004_REGISTRATION_OWNER_MISMATCH")
      }

      if (decoded.args.agentURI !== input.expectedAgentURI) {
        throw new Error("ERC8004_REGISTRATION_URI_MISMATCH")
      }

      return {
        agentId: decoded.args.agentId,
        owner,
        agentURI: decoded.args.agentURI,
        blockNumber: receipt.blockNumber,
        attribution: await verifyMurkAttribution(input.txHash),
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith("ERC8004_REGISTRATION_")
      ) {
        throw error
      }
    }
  }

  throw new Error("ERC8004_REGISTERED_EVENT_NOT_FOUND")
}

export async function getErc8004Status(input: {
  agentId: bigint
  expectedOwner: Address
  expectedAgentWallet: Address
}): Promise<Erc8004Status> {
  const client = getCeloClient()

  try {
    const [owner, registeredWallet] = await Promise.all([
      client.readContract({
        address: CELO_ERC8004_IDENTITY_REGISTRY,
        abi: ERC8004_IDENTITY_ABI,
        functionName: "ownerOf",
        args: [input.agentId],
      }),
      client.readContract({
        address: CELO_ERC8004_IDENTITY_REGISTRY,
        abi: ERC8004_IDENTITY_ABI,
        functionName: "getAgentWallet",
        args: [input.agentId],
      }),
    ])

    return {
      registered: true,
      agentId: input.agentId.toString(),
      owner,
      registeredWallet,
      expectedOwner: input.expectedOwner,
      expectedAgentWallet: input.expectedAgentWallet,
      ownerMatches:
        owner.toLowerCase() === input.expectedOwner.toLowerCase(),
      walletBound:
        registeredWallet.toLowerCase() ===
        input.expectedAgentWallet.toLowerCase(),
    }
  } catch (error) {
    throw new Error(
      `ERC8004_STATUS_UNAVAILABLE:${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }
}

export async function buildBindWalletTransaction(input: {
  agentInternalId: string
  agentId: bigint
  owner: Address
  deadline?: bigint
}): Promise<{
  to: Address
  data: Hex
  deadline: bigint
  signature: Hex
}> {
  const account = resolveAgentViemAccount(input.agentInternalId)
  const deadline =
    input.deadline ?? BigInt(Math.floor(Date.now() / 1000) + 4 * 60)

  const signature = await account.signTypedData({
    domain: {
      name: "ERC8004IdentityRegistry",
      version: "1",
      chainId: 42220,
      verifyingContract: CELO_ERC8004_IDENTITY_REGISTRY,
    },
    types: {
      AgentWalletSet: [
        { name: "agentId", type: "uint256" },
        { name: "newWallet", type: "address" },
        { name: "owner", type: "address" },
        { name: "deadline", type: "uint256" },
      ],
    },
    primaryType: "AgentWalletSet",
    message: {
      agentId: input.agentId,
      newWallet: account.address,
      owner: input.owner,
      deadline,
    },
  })

  const data = encodeFunctionData({
    abi: ERC8004_IDENTITY_ABI,
    functionName: "setAgentWallet",
    args: [input.agentId, account.address, deadline, signature],
  })

  return {
    to: CELO_ERC8004_IDENTITY_REGISTRY,
    data: appendMurkAttribution(data),
    deadline,
    signature,
  }
}

export async function verifyBoundWallet(input: {
  txHash: Hex
  agentId: bigint
  expectedOwner: Address
  expectedAgentWallet: Address
}): Promise<{
  blockNumber: bigint
  attribution: Awaited<ReturnType<typeof verifyMurkAttribution>>
  status: Erc8004Status
}> {
  const client = getCeloClient()
  const [receipt, transaction] = await Promise.all([
    client.getTransactionReceipt({ hash: input.txHash }),
    client.getTransaction({ hash: input.txHash }),
  ])

  if (receipt.status !== "success") {
    throw new Error("ERC8004_BIND_REVERTED")
  }

  if (
    transaction.from.toLowerCase() !== input.expectedOwner.toLowerCase() ||
    transaction.to?.toLowerCase() !==
      CELO_ERC8004_IDENTITY_REGISTRY.toLowerCase()
  ) {
    throw new Error("ERC8004_BIND_TX_MISMATCH")
  }

  const status = await getErc8004Status({
    agentId: input.agentId,
    expectedOwner: input.expectedOwner,
    expectedAgentWallet: input.expectedAgentWallet,
  })

  if (!status.registered || !status.ownerMatches || !status.walletBound) {
    throw new Error("ERC8004_BIND_NOT_VERIFIED")
  }

  return {
    blockNumber: receipt.blockNumber,
    attribution: await verifyMurkAttribution(input.txHash),
    status,
  }
}
