/**
 * Coinbase AgentKit action definitions for moltraffle.
 *
 * Usage:
 *   import { MOLTRAFFLE_ACTIONS } from "moltraffle/agentkit";
 *
 *   // Register with your AgentKit instance
 *   agentkit.registerActions(MOLTRAFFLE_ACTIONS);
 *
 * Peer dependency: @coinbase/agentkit
 */
import { z } from "zod";
import { MoltraffleClient } from "./client";

const client = new MoltraffleClient();

export interface AgentKitAction<TInput extends z.ZodTypeAny> {
  name: string;
  description: string;
  schema: TInput;
  invoke: (walletProvider: any, input: z.infer<TInput>) => Promise<string>;
}

const listRafflesSchema = z.object({
  status: z
    .enum(["upcoming", "active", "ended", "drawn", "cancelled", "claimed"])
    .default("active")
    .describe("Filter raffles by status"),
  limit: z.number().int().min(1).max(50).default(10).describe("Max number of raffles to return"),
});

const listRafflesAction: AgentKitAction<typeof listRafflesSchema> = {
  name: "moltraffle_list_raffles",
  description:
    "List raffles on moltraffle.fun (Base mainnet). Returns addresses, titles, entry fees in USDC, prize pools, participant counts, and deadlines.",
  schema: listRafflesSchema,
  invoke: async (_wallet, { status, limit }) => {
    const result = await client.listRaffles({ status, limit });
    if (!result.raffles.length) return `No ${status} raffles found.`;
    return result.raffles
      .map(
        (r) =>
          `${r.title} | ${r.address} | entry=${r.entryFeeFormatted} | pool=${r.prizePoolFormatted} | ${r.currentParticipants}${r.maxParticipants ? `/${r.maxParticipants}` : ""} participants`
      )
      .join("\n");
  },
};

const getRaffleSchema = z.object({
  address: z.string().describe("Raffle contract address (0x...)"),
});

const getRaffleAction: AgentKitAction<typeof getRaffleSchema> = {
  name: "moltraffle_get_raffle",
  description: "Get full details and available actions for a moltraffle raffle by contract address.",
  schema: getRaffleSchema,
  invoke: async (_wallet, { address }) => {
    const r = await client.getRaffle(address);
    const available = Object.entries(r.actions ?? {})
      .filter(([, v]) => (v as any)?.available)
      .map(([k]) => k);
    return [
      `Title: ${r.title}`,
      `Status: ${r.statusLabel}`,
      `Entry: ${r.entryFeeFormatted} USDC`,
      `Pool: ${r.prizePoolFormatted} USDC`,
      `Participants: ${r.currentParticipants}${r.maxParticipants ? `/${r.maxParticipants}` : ""}`,
      `Deadline: ${r.deadlineISO}`,
      `Available: ${available.join(", ") || "none"}`,
    ].join("\n");
  },
};

const createRaffleSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(500),
  entryFee: z.string().describe("Entry fee in USDC, e.g. '1' for 1 USDC"),
  deadline: z.number().int().describe("Unix timestamp for raffle end"),
  maxParticipants: z.number().int().min(0).default(0),
  prizeDescription: z.string().optional(),
  creatorCommissionBps: z.number().int().min(0).max(1000).default(0),
});

const createRaffleAction: AgentKitAction<typeof createRaffleSchema> = {
  name: "moltraffle_create_raffle",
  description:
    "Create a new raffle on moltraffle.fun (Base mainnet). Fetches calldata from the API and sends the transaction via the wallet provider. Returns the transaction hash.",
  schema: createRaffleSchema,
  invoke: async (walletProvider, params) => {
    const cd = await client.getCreateCalldata(params);
    const txHash = await walletProvider.sendTransaction({
      to: cd.to,
      data: cd.calldata,
      value: cd.value,
    });
    return `Raffle creation transaction sent: ${txHash}\nCreation fee: ${cd.valueFormatted}`;
  },
};

const joinRaffleSchema = z.object({
  raffleAddress: z.string().describe("Raffle contract address to join"),
  ticketCount: z.number().int().min(1).default(1).describe("Number of tickets to buy"),
});

const joinRaffleAction: AgentKitAction<typeof joinRaffleSchema> = {
  name: "moltraffle_join_raffle",
  description:
    "Join a raffle on moltraffle.fun by buying tickets. Fetches calldata and sends the transaction via the wallet provider. Returns transaction hash.",
  schema: joinRaffleSchema,
  invoke: async (walletProvider, { raffleAddress, ticketCount }) => {
    const action = await client.getJoinCalldata(raffleAddress);
    const entryFee = BigInt(action.value ?? "0");
    const totalValue = (entryFee * BigInt(ticketCount)).toString();
    const txHash = await walletProvider.sendTransaction({
      to: action.to,
      data: action.calldata_example ?? action.calldata,
      value: totalValue,
    });
    return `Joined raffle with ${ticketCount} ticket(s). Transaction: ${txHash}`;
  },
};

const drawWinnerSchema = z.object({
  raffleAddress: z.string().describe("Raffle contract address to draw winner for"),
});

const drawWinnerAction: AgentKitAction<typeof drawWinnerSchema> = {
  name: "moltraffle_draw_winner",
  description:
    "Trigger Chainlink VRF winner selection for a moltraffle raffle (permissionless after deadline). Sends transaction via wallet provider.",
  schema: drawWinnerSchema,
  invoke: async (walletProvider, { raffleAddress }) => {
    const action = await client.getDrawCalldata(raffleAddress);
    const txHash = await walletProvider.sendTransaction({
      to: action.to,
      data: action.calldata,
      value: "0",
    });
    return `Draw winner transaction sent: ${txHash}. Chainlink VRF will fulfil in ~30s.`;
  },
};

const claimPrizeSchema = z.object({
  raffleAddress: z.string().describe("Raffle contract address to claim prize from"),
});

const claimPrizeAction: AgentKitAction<typeof claimPrizeSchema> = {
  name: "moltraffle_claim_prize",
  description:
    "Claim the prize from a raffle you won on moltraffle.fun. Sends transaction via wallet provider.",
  schema: claimPrizeSchema,
  invoke: async (walletProvider, { raffleAddress }) => {
    const action = await client.getClaimCalldata(raffleAddress);
    const txHash = await walletProvider.sendTransaction({
      to: action.to,
      data: action.calldata,
      value: "0",
    });
    return `Prize claim transaction sent: ${txHash}`;
  },
};

export const MOLTRAFFLE_ACTIONS = [
  listRafflesAction,
  getRaffleAction,
  createRaffleAction,
  joinRaffleAction,
  drawWinnerAction,
  claimPrizeAction,
] as const;
