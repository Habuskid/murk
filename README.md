# Black Box MVP

Black Box is forensic infrastructure for autonomous financial agents. It persists the evidence available before a decision, evaluates the decision separately from its eventual P&L, and keeps later information in a distinct **Known Now** field.

## What is real

- The Trader runtime calls the official Binance Agentic MCP endpoint from the server.
- The raw MCP result is persisted before it is displayed.
- The LLM receives only that captured result and returns a constrained decision object.
- A deterministic server-side policy checks the proposed exposure.
- The independent quality evaluator never receives Binance tools or later market data.

There is deliberately no mock mode. If credentials, a tool name, or the MCP connection are unavailable, `/api/run` returns an explicit error and persists no fabricated decision.

## Run

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Configure the credentials issued by the Binance Agentic connection flow, then set `BINANCE_MARKET_TOOL` to an exact tool returned by `tools/list` and `BINANCE_MARKET_ARGS_JSON` to its arguments. The first missing-tool error intentionally lists the live tools discovered from Binance.

## Safety boundary

`BLACKBOX_TRADING_ENABLED` defaults to `false`; the maximum notional defaults to 5 USDT. The browser cannot provide a trade size. No secret is referenced by client code. The current MVP records and policy-checks proposed actions but does not submit an order. `BINANCE_TRADE_TOOL` is reserved for a separately confirmed execution step after its live schema is verified.

## Scope

The database includes the required entities. The working slice covers Agent, Mandate, Decision, ToolCall, MarketSnapshot, DecisionQuality, Incident, and computed AutonomyReadiness. Execution, Counterfactual, Investigation, Postmortem, and FeedbackRule tables are present as extension points but are not falsely represented as complete UI features.
