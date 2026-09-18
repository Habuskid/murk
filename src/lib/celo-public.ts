export const PUBLIC_CELO_CHAIN_ID =
  process.env.NEXT_PUBLIC_CELO_CHAIN_ID === "11142220" ? 11142220 : 42220

export const PUBLIC_CELO_CAIP2_NETWORK =
  PUBLIC_CELO_CHAIN_ID === 11142220
    ? ("eip155:11142220" as const)
    : ("eip155:42220" as const)

export const PUBLIC_CELO_NETWORK_NAME =
  PUBLIC_CELO_CHAIN_ID === 11142220 ? "Celo Sepolia" : "Celo Mainnet"

export const PUBLIC_CELO_RPC_URL =
  process.env.NEXT_PUBLIC_CELO_RPC_URL ||
  (PUBLIC_CELO_CHAIN_ID === 11142220
    ? "https://forno.celo-sepolia.celo-testnet.org"
    : "https://forno.celo.org")

export const PUBLIC_CELO_EXPLORER_BASE_URL =
  PUBLIC_CELO_CHAIN_ID === 11142220
    ? "https://sepolia.celoscan.io"
    : "https://celoscan.io"

export const PUBLIC_CELO_IDENTITY_REGISTRY =
  PUBLIC_CELO_CHAIN_ID === 11142220
    ? "0x8004A818BFB912233c491871b3d84c89A494BD9e"
    : "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432"
