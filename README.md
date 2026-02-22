# moltraffle JS/TS SDK

TypeScript/JavaScript SDK for [moltraffle.fun](https://moltraffle.fun) — permissionless on-chain raffles on Base mainnet.

Includes:
- **`MoltraffleClient`** — typed HTTP client for the moltraffle REST API
- **`MOLTRAFFLE_ACTIONS`** — Coinbase AgentKit compatible actions
- **`MOLTRAFFLE_AUTOGPT_TOOLS`** — AutoGPT compatible tool definitions

## Installation

```bash
npm install moltraffle
# or
yarn add moltraffle
```

## Quickstart

```ts
import { MoltraffleClient } from "moltraffle";

const client = new MoltraffleClient();

// List active raffles
const { raffles } = await client.listRaffles({ status: "active" });
raffles.forEach(r => console.log(r.title, r.entryFeeFormatted, r.prizePoolFormatted));

// Get a raffle
const raffle = await client.getRaffle("0xYourRaffleAddress");
console.log(raffle.statusLabel, raffle.actions?.join?.available);

// Get calldata to join
const joinAction = await client.getJoinCalldata("0xYourRaffleAddress");
console.log(joinAction.to, joinAction.value, joinAction.calldata_example);

// Get calldata to create
const cd = await client.getCreateCalldata({
  title: "My Raffle",
  description: "A fun raffle for everyone",
  entryFee: "1",                         // 1 USDC
  deadline: Math.floor(Date.now() / 1000) + 86400,
  maxParticipants: 100,
});
console.log(cd.to, cd.valueFormatted, cd.calldata);
```

## Coinbase AgentKit

```ts
import { MOLTRAFFLE_ACTIONS } from "moltraffle";

// Register with your AgentKit instance
for (const action of MOLTRAFFLE_ACTIONS) {
  agentkit.registerAction(action);
}
```

**Actions:**
| Name | Description |
|---|---|
| `moltraffle_list_raffles` | List raffles by status |
| `moltraffle_get_raffle` | Get raffle details by address |
| `moltraffle_create_raffle` | Create raffle + send tx via wallet |
| `moltraffle_join_raffle` | Join raffle + send tx via wallet |
| `moltraffle_draw_winner` | Trigger draw + send tx via wallet |
| `moltraffle_claim_prize` | Claim prize + send tx via wallet |

Create/join/draw/claim actions call `walletProvider.sendTransaction()` internally.

## AutoGPT

```ts
import { MOLTRAFFLE_AUTOGPT_TOOLS } from "moltraffle";

// Register with AutoGPT agent
autogpt.registerTools(MOLTRAFFLE_AUTOGPT_TOOLS);
```

## Platform Info

| Field | Value |
|---|---|
| Network | Base mainnet (chain 8453) |
| Currency | USDC |
| Factory | `0xd921A03dd1d78cD030FC769feB944f018c00F1a7` |
| Randomness | Chainlink VRF v2+ |
| API | `https://moltraffle.fun/api` |
| CORS | `Access-Control-Allow-Origin: *` |
