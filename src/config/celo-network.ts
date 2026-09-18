import { defineChain } from "viem"
import { celo } from "viem/chains"

export type MurkNetworkMode = "testnet" | "mainnet"

const celoSepolia = defineChain({
  id: 11142220,
  name: "Celo Sepolia",
  nativeCurrency: {
    name: "CELO",
    symbol: "CELO",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://forno.celo-sepolia.celo-testnet.org"],
    },
  },
  blockExplorers: {
    default: {
      name: "Celo Sepolia Blockscout",
      url: "https://celo-sepolia.blockscout.com",
    },
  },
  testnet: true,
})

const mainnet = {
  mode: "mainnet" as const,
  label: "Celo",
  shortLabel: "Celo",
  chain: celo,
  chainId: 42220,
  caip2: "eip155:42220" as const,
  rpcUrl: "https://forno.celo.org",
  explorerUrl: "https://celoscan.io",
  x402FacilitatorUrl: "https://api.x402.celo.org",
  erc8004IdentityRegistry:
    "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as `0x${string}`,
  tokens: {
    USDC: {
      symbol: "USDC",
      name: "USD Coin",
      address:
        "0xcebA9300f2b948710d2653dD7B07f33A8B32118C" as `0x${string}`,
      feeCurrencyAddress:
        "0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B" as `0x${string}`,
      decimals: 6,
    },
    USDT: {
      symbol: "USDT",
      name: "Tether USD",
      address:
        "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e" as `0x${string}`,
      feeCurrencyAddress:
        "0x0E2A3e05bc9A16F5292A6170456A710cb89C6f72" as `0x${string}`,
      decimals: 6,
    },
  },
}

const testnet = {
  mode: "testnet" as const,
  label: "Celo Sepolia",
  shortLabel: "Sepolia",
  chain: celoSepolia,
  chainId: 11142220,
  caip2: "eip155:11142220" as const,
  rpcUrl: "https://forno.celo-sepolia.celo-testnet.org",
  explorerUrl: "https://celo-sepolia.blockscout.com",
  x402FacilitatorUrl: "https://api.x402.sepolia.celo.org",
  erc8004IdentityRegistry:
    "0x8004A818BFB912233c491871b3d84c89A494BD9e" as `0x${string}`,
  tokens: {
    USDC: {
      symbol: "USDC",
      name: "USD Coin",
      address:
        "0x01C5C0122039549AD1493B8220cABEdD739BC44E" as `0x${string}`,
      feeCurrencyAddress:
        "0xbf1441Ea57f43f35f713431001f35742c88071c7" as `0x${string}`,
      decimals: 6,
    },
    USDT: {
      symbol: "USDT",
      name: "Tether USD",
      address:
        "0xd077A400968890Eacc75cdc901F0356c943e4fDb" as `0x${string}`,
      feeCurrencyAddress:
        "0xe19447B12cb0d0220B2a501D8382be2f61CcF92a" as `0x${string}`,
      decimals: 6,
    },
  },
}

export const MURK_NETWORK_MODE: MurkNetworkMode =
  process.env.NEXT_PUBLIC_MURK_NETWORK === "mainnet" ? "mainnet" : "testnet"

export const ACTIVE_CELO_NETWORK =
  MURK_NETWORK_MODE === "mainnet" ? mainnet : testnet

export const CELO_CHAIN = ACTIVE_CELO_NETWORK.chain
export const CELO_CHAIN_ID = ACTIVE_CELO_NETWORK.chainId
export const CELO_CAIP2 = ACTIVE_CELO_NETWORK.caip2
export const CELO_NETWORK_LABEL = ACTIVE_CELO_NETWORK.label
export const CELO_NETWORK_SHORT_LABEL = ACTIVE_CELO_NETWORK.shortLabel
export const CELO_DEFAULT_RPC_URL = ACTIVE_CELO_NETWORK.rpcUrl
export const CELO_EXPLORER_URL = ACTIVE_CELO_NETWORK.explorerUrl
export const CELO_X402_FACILITATOR_URL =
  ACTIVE_CELO_NETWORK.x402FacilitatorUrl
export const CELO_ERC8004_IDENTITY_REGISTRY =
  ACTIVE_CELO_NETWORK.erc8004IdentityRegistry
export const CELO_TOKENS = ACTIVE_CELO_NETWORK.tokens
export const IS_CELO_TESTNET = MURK_NETWORK_MODE === "testnet"
