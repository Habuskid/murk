import { afterEach, describe, expect, it } from "vitest"
import {
  decodeFunctionData,
  recoverTypedDataAddress,
} from "viem"
import {
  buildBindWalletTransaction,
  buildRegisterTransaction,
  CELO_ERC8004_IDENTITY_REGISTRY,
  ERC8004_IDENTITY_ABI,
} from "../src/services/erc8004"
import { resolveAgentViemAccount } from "../src/services/agent-wallet"
import { CELO_CHAIN_ID } from "../src/services/celo"

const MASTER_SECRET =
  "1111111111111111111111111111111111111111111111111111111111111111"

afterEach(() => {
  delete process.env.CELO_ATTRIBUTION_CODE
  delete process.env.AGENT_WALLET_MASTER_SECRET
})

describe("ERC-8004 identity integration", () => {
  it("builds human-owned registration calldata for the Celo registry", () => {
    delete process.env.CELO_ATTRIBUTION_CODE

    const uri = "https://murk.example/api/agents/agent_01/erc8004/metadata"
    const tx = buildRegisterTransaction(uri)

    expect(tx.to).toBe(CELO_ERC8004_IDENTITY_REGISTRY)

    const decoded = decodeFunctionData({
      abi: ERC8004_IDENTITY_ABI,
      data: tx.data,
    })

    expect(decoded.functionName).toBe("register")
    expect(decoded.args?.[0]).toBe(uri)
  })

  it("binds only the deterministic Murk execution wallet with its own EIP-712 consent", async () => {
    process.env.AGENT_WALLET_MASTER_SECRET = MASTER_SECRET
    delete process.env.CELO_ATTRIBUTION_CODE

    const internalAgentId = "agent_test_8004"
    const agentId = 42n
    const owner = "0x1111111111111111111111111111111111111111" as const
    const deadline = 2_000_000_000n
    const expectedAgentWallet = resolveAgentViemAccount(internalAgentId).address

    const tx = await buildBindWalletTransaction({
      agentInternalId: internalAgentId,
      agentId,
      owner,
      deadline,
    })

    expect(tx.to).toBe(CELO_ERC8004_IDENTITY_REGISTRY)
    expect(tx.deadline).toBe(deadline)

    const decoded = decodeFunctionData({
      abi: ERC8004_IDENTITY_ABI,
      data: tx.data,
    })

    expect(decoded.functionName).toBe("setAgentWallet")

    const [decodedAgentId, decodedWallet, decodedDeadline, signature] =
      decoded.args as readonly [
        bigint,
        `0x${string}`,
        bigint,
        `0x${string}`,
      ]

    expect(decodedAgentId).toBe(agentId)
    expect(decodedWallet.toLowerCase()).toBe(expectedAgentWallet.toLowerCase())
    expect(decodedDeadline).toBe(deadline)

    const recovered = await recoverTypedDataAddress({
      domain: {
        name: "ERC8004IdentityRegistry",
        version: "1",
        chainId: CELO_CHAIN_ID,
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
        agentId,
        newWallet: expectedAgentWallet,
        owner,
        deadline,
      },
      signature,
    })

    expect(recovered.toLowerCase()).toBe(expectedAgentWallet.toLowerCase())
  })
})
