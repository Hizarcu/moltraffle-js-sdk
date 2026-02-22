// src/types.ts
var RaffleStatus = /* @__PURE__ */ ((RaffleStatus2) => {
  RaffleStatus2[RaffleStatus2["UPCOMING"] = 0] = "UPCOMING";
  RaffleStatus2[RaffleStatus2["ACTIVE"] = 1] = "ACTIVE";
  RaffleStatus2[RaffleStatus2["ENDED"] = 2] = "ENDED";
  RaffleStatus2[RaffleStatus2["DRAWN"] = 3] = "DRAWN";
  RaffleStatus2[RaffleStatus2["CANCELLED"] = 4] = "CANCELLED";
  RaffleStatus2[RaffleStatus2["CLAIMED"] = 5] = "CLAIMED";
  return RaffleStatus2;
})(RaffleStatus || {});
var MoltraffleError = class extends Error {
  constructor(message, statusCode, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = "MoltraffleError";
  }
};

// src/client.ts
var DEFAULT_BASE_URL = "https://moltraffle.fun";
var MoltraffleClient = class {
  constructor(baseUrl = DEFAULT_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }
  async get(path, params) {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== void 0) url.searchParams.set(k, String(v));
      }
    }
    const res = await fetch(url.toString());
    const data = await res.json();
    if (!res.ok) {
      throw new MoltraffleError(
        data.error ?? `API error ${res.status}`,
        res.status,
        data.details
      );
    }
    return data;
  }
  /** Return platform configuration including chain info, ABIs, and validation rules. */
  getConfig() {
    return this.get("/api/config");
  }
  /** List raffles with optional filtering by status, creator, and pagination. */
  listRaffles(params) {
    return this.get("/api/raffles", {
      status: params?.status,
      creator: params?.creator,
      limit: params?.limit ?? 50,
      offset: params?.offset ?? 0
    });
  }
  /** Get full details of a raffle by contract address, including available actions. */
  getRaffle(address) {
    return this.get(`/api/raffle/${address}`);
  }
  /** Get encoded calldata to create a new raffle via the factory contract. */
  getCreateCalldata(params) {
    return this.get("/api/factory/calldata", {
      title: params.title,
      description: params.description,
      entryFee: params.entryFee,
      deadline: params.deadline,
      maxParticipants: params.maxParticipants ?? 0,
      prizeDescription: params.prizeDescription,
      creatorCommissionBps: params.creatorCommissionBps ?? 0
    });
  }
  /** Get the join action calldata for a raffle. Throws if raffle is not joinable. */
  async getJoinCalldata(raffleAddress) {
    const raffle = await this.getRaffle(raffleAddress);
    const action = raffle.actions?.join;
    if (!action?.available) {
      throw new MoltraffleError(action?.reason ?? "Raffle is not joinable");
    }
    return action;
  }
  /** Get the drawWinner calldata. Throws if draw is not yet available. */
  async getDrawCalldata(raffleAddress) {
    const raffle = await this.getRaffle(raffleAddress);
    const action = raffle.actions?.draw;
    if (!action?.available) {
      throw new MoltraffleError(action?.reason ?? "Draw not yet available");
    }
    return action;
  }
  /** Get the claimPrize calldata. Throws if claim is not available. */
  async getClaimCalldata(raffleAddress) {
    const raffle = await this.getRaffle(raffleAddress);
    const action = raffle.actions?.claim;
    if (!action?.available) {
      throw new MoltraffleError(action?.reason ?? "Claim not available");
    }
    return action;
  }
};

// src/agentkit.ts
import { z } from "zod";
var client = new MoltraffleClient();
var listRafflesSchema = z.object({
  status: z.enum(["upcoming", "active", "ended", "drawn", "cancelled", "claimed"]).default("active").describe("Filter raffles by status"),
  limit: z.number().int().min(1).max(50).default(10).describe("Max number of raffles to return")
});
var listRafflesAction = {
  name: "moltraffle_list_raffles",
  description: "List raffles on moltraffle.fun (Base mainnet). Returns addresses, titles, entry fees in USDC, prize pools, participant counts, and deadlines.",
  schema: listRafflesSchema,
  invoke: async (_wallet, { status, limit }) => {
    const result = await client.listRaffles({ status, limit });
    if (!result.raffles.length) return `No ${status} raffles found.`;
    return result.raffles.map(
      (r) => `${r.title} | ${r.address} | entry=${r.entryFeeFormatted} | pool=${r.prizePoolFormatted} | ${r.currentParticipants}${r.maxParticipants ? `/${r.maxParticipants}` : ""} participants`
    ).join("\n");
  }
};
var getRaffleSchema = z.object({
  address: z.string().describe("Raffle contract address (0x...)")
});
var getRaffleAction = {
  name: "moltraffle_get_raffle",
  description: "Get full details and available actions for a moltraffle raffle by contract address.",
  schema: getRaffleSchema,
  invoke: async (_wallet, { address }) => {
    const r = await client.getRaffle(address);
    const available = Object.entries(r.actions ?? {}).filter(([, v]) => v?.available).map(([k]) => k);
    return [
      `Title: ${r.title}`,
      `Status: ${r.statusLabel}`,
      `Entry: ${r.entryFeeFormatted} USDC`,
      `Pool: ${r.prizePoolFormatted} USDC`,
      `Participants: ${r.currentParticipants}${r.maxParticipants ? `/${r.maxParticipants}` : ""}`,
      `Deadline: ${r.deadlineISO}`,
      `Available: ${available.join(", ") || "none"}`
    ].join("\n");
  }
};
var createRaffleSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(500),
  entryFee: z.string().describe("Entry fee in USDC, e.g. '1' for 1 USDC"),
  deadline: z.number().int().describe("Unix timestamp for raffle end"),
  maxParticipants: z.number().int().min(0).default(0),
  prizeDescription: z.string().optional(),
  creatorCommissionBps: z.number().int().min(0).max(1e3).default(0)
});
var createRaffleAction = {
  name: "moltraffle_create_raffle",
  description: "Create a new raffle on moltraffle.fun (Base mainnet). Fetches calldata from the API and sends the transaction via the wallet provider. Returns the transaction hash.",
  schema: createRaffleSchema,
  invoke: async (walletProvider, params) => {
    const cd = await client.getCreateCalldata(params);
    const txHash = await walletProvider.sendTransaction({
      to: cd.to,
      data: cd.calldata,
      value: cd.value
    });
    return `Raffle creation transaction sent: ${txHash}
Creation fee: ${cd.valueFormatted}`;
  }
};
var joinRaffleSchema = z.object({
  raffleAddress: z.string().describe("Raffle contract address to join"),
  ticketCount: z.number().int().min(1).default(1).describe("Number of tickets to buy")
});
var joinRaffleAction = {
  name: "moltraffle_join_raffle",
  description: "Join a raffle on moltraffle.fun by buying tickets. Fetches calldata and sends the transaction via the wallet provider. Returns transaction hash.",
  schema: joinRaffleSchema,
  invoke: async (walletProvider, { raffleAddress, ticketCount }) => {
    const action = await client.getJoinCalldata(raffleAddress);
    const entryFee = BigInt(action.value ?? "0");
    const totalValue = (entryFee * BigInt(ticketCount)).toString();
    const txHash = await walletProvider.sendTransaction({
      to: action.to,
      data: action.calldata_example ?? action.calldata,
      value: totalValue
    });
    return `Joined raffle with ${ticketCount} ticket(s). Transaction: ${txHash}`;
  }
};
var drawWinnerSchema = z.object({
  raffleAddress: z.string().describe("Raffle contract address to draw winner for")
});
var drawWinnerAction = {
  name: "moltraffle_draw_winner",
  description: "Trigger Chainlink VRF winner selection for a moltraffle raffle (permissionless after deadline). Sends transaction via wallet provider.",
  schema: drawWinnerSchema,
  invoke: async (walletProvider, { raffleAddress }) => {
    const action = await client.getDrawCalldata(raffleAddress);
    const txHash = await walletProvider.sendTransaction({
      to: action.to,
      data: action.calldata,
      value: "0"
    });
    return `Draw winner transaction sent: ${txHash}. Chainlink VRF will fulfil in ~30s.`;
  }
};
var claimPrizeSchema = z.object({
  raffleAddress: z.string().describe("Raffle contract address to claim prize from")
});
var claimPrizeAction = {
  name: "moltraffle_claim_prize",
  description: "Claim the prize from a raffle you won on moltraffle.fun. Sends transaction via wallet provider.",
  schema: claimPrizeSchema,
  invoke: async (walletProvider, { raffleAddress }) => {
    const action = await client.getClaimCalldata(raffleAddress);
    const txHash = await walletProvider.sendTransaction({
      to: action.to,
      data: action.calldata,
      value: "0"
    });
    return `Prize claim transaction sent: ${txHash}`;
  }
};
var MOLTRAFFLE_ACTIONS = [
  listRafflesAction,
  getRaffleAction,
  createRaffleAction,
  joinRaffleAction,
  drawWinnerAction,
  claimPrizeAction
];

// src/autogpt.ts
var client2 = new MoltraffleClient();
var MOLTRAFFLE_AUTOGPT_TOOLS = [
  {
    name: "moltraffle_list_raffles",
    description: "List active raffles on moltraffle.fun (Base mainnet). Returns raffle details including entry fees in USDC, prize pools, and deadlines.",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["upcoming", "active", "ended", "drawn", "cancelled", "claimed"],
          default: "active",
          description: "Filter by raffle status"
        },
        limit: { type: "integer", minimum: 1, maximum: 50, default: 10 }
      }
    },
    execute: async ({ status = "active", limit = 10 } = {}) => {
      const result = await client2.listRaffles({ status, limit: Number(limit) });
      return JSON.stringify(result.raffles.map((r) => ({
        address: r.address,
        title: r.title,
        entryFee: r.entryFeeFormatted,
        prizePool: r.prizePoolFormatted,
        participants: `${r.currentParticipants}${r.maxParticipants ? `/${r.maxParticipants}` : ""}`,
        deadline: r.deadlineISO,
        status: r.statusLabel
      })));
    }
  },
  {
    name: "moltraffle_get_raffle",
    description: "Get full details and available actions for a specific raffle by contract address.",
    parameters: {
      type: "object",
      required: ["address"],
      properties: {
        address: { type: "string", description: "Raffle contract address (0x...)" }
      }
    },
    execute: async ({ address }) => {
      const r = await client2.getRaffle(String(address));
      return JSON.stringify({
        address: r.address,
        title: r.title,
        description: r.description,
        status: r.statusLabel,
        entryFee: r.entryFeeFormatted,
        prizePool: r.prizePoolFormatted,
        participants: r.currentParticipants,
        maxParticipants: r.maxParticipants,
        deadline: r.deadlineISO,
        creator: r.creator,
        winner: r.winner,
        availableActions: Object.entries(r.actions ?? {}).filter(([, v]) => v?.available).map(([k]) => k)
      });
    }
  },
  {
    name: "moltraffle_get_join_calldata",
    description: "Get the transaction calldata needed to join a raffle. Returns 'to', 'value' (in wei), and 'calldata' for the agent's wallet to sign.",
    parameters: {
      type: "object",
      required: ["raffleAddress"],
      properties: {
        raffleAddress: { type: "string", description: "Raffle contract address" }
      }
    },
    execute: async ({ raffleAddress }) => {
      const action = await client2.getJoinCalldata(String(raffleAddress));
      return JSON.stringify({
        to: action.to,
        value: action.value,
        calldata: action.calldata_example ?? action.calldata,
        function: action.function,
        note: action.note
      });
    }
  },
  {
    name: "moltraffle_get_create_calldata",
    description: "Get the transaction calldata to create a new raffle on moltraffle.fun.",
    parameters: {
      type: "object",
      required: ["title", "description", "entryFee", "deadline"],
      properties: {
        title: { type: "string", minLength: 3, maxLength: 100 },
        description: { type: "string", minLength: 10, maxLength: 500 },
        entryFee: { type: "string", description: "USDC amount, e.g. '1'" },
        deadline: { type: "integer", description: "Unix timestamp" },
        maxParticipants: { type: "integer", default: 0, description: "0 = unlimited" }
      }
    },
    execute: async (params) => {
      const cd = await client2.getCreateCalldata({
        title: String(params.title),
        description: String(params.description),
        entryFee: String(params.entryFee),
        deadline: Number(params.deadline),
        maxParticipants: params.maxParticipants ? Number(params.maxParticipants) : 0
      });
      return JSON.stringify({ to: cd.to, value: cd.value, valueFormatted: cd.valueFormatted, calldata: cd.calldata });
    }
  }
];
export {
  MOLTRAFFLE_ACTIONS,
  MOLTRAFFLE_AUTOGPT_TOOLS,
  MoltraffleClient,
  MoltraffleError,
  RaffleStatus
};
