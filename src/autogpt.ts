/**
 * AutoGPT-compatible tool definitions for moltraffle.
 * Each tool has a name, description, JSON Schema parameters, and execute function.
 */
import { MoltraffleClient } from "./client";

const client = new MoltraffleClient();

export interface AutoGPTTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (params: Record<string, unknown>) => Promise<string>;
}

export const MOLTRAFFLE_AUTOGPT_TOOLS: AutoGPTTool[] = [
  {
    name: "moltraffle_list_raffles",
    description:
      "List active raffles on moltraffle.fun (Base mainnet). Returns raffle details including entry fees in USDC, prize pools, and deadlines.",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["upcoming", "active", "ended", "drawn", "cancelled", "claimed"],
          default: "active",
          description: "Filter by raffle status",
        },
        limit: { type: "integer", minimum: 1, maximum: 50, default: 10 },
      },
    },
    execute: async ({ status = "active", limit = 10 } = {}) => {
      const result = await client.listRaffles({ status: status as any, limit: Number(limit) });
      return JSON.stringify(result.raffles.map((r) => ({
        address: r.address,
        title: r.title,
        entryFee: r.entryFeeFormatted,
        prizePool: r.prizePoolFormatted,
        participants: `${r.currentParticipants}${r.maxParticipants ? `/${r.maxParticipants}` : ""}`,
        deadline: r.deadlineISO,
        status: r.statusLabel,
      })));
    },
  },
  {
    name: "moltraffle_get_raffle",
    description: "Get full details and available actions for a specific raffle by contract address.",
    parameters: {
      type: "object",
      required: ["address"],
      properties: {
        address: { type: "string", description: "Raffle contract address (0x...)" },
      },
    },
    execute: async ({ address }) => {
      const r = await client.getRaffle(String(address));
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
        availableActions: Object.entries(r.actions ?? {})
          .filter(([, v]) => (v as any)?.available)
          .map(([k]) => k),
      });
    },
  },
  {
    name: "moltraffle_get_join_calldata",
    description:
      "Get the transaction calldata needed to join a raffle. Returns 'to', 'value' (in wei), and 'calldata' for the agent's wallet to sign.",
    parameters: {
      type: "object",
      required: ["raffleAddress"],
      properties: {
        raffleAddress: { type: "string", description: "Raffle contract address" },
      },
    },
    execute: async ({ raffleAddress }) => {
      const action = await client.getJoinCalldata(String(raffleAddress));
      return JSON.stringify({
        to: action.to,
        value: action.value,
        calldata: action.calldata_example ?? action.calldata,
        function: action.function,
        note: action.note,
      });
    },
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
        maxParticipants: { type: "integer", default: 0, description: "0 = unlimited" },
      },
    },
    execute: async (params) => {
      const cd = await client.getCreateCalldata({
        title: String(params.title),
        description: String(params.description),
        entryFee: String(params.entryFee),
        deadline: Number(params.deadline),
        maxParticipants: params.maxParticipants ? Number(params.maxParticipants) : 0,
      });
      return JSON.stringify({ to: cd.to, value: cd.value, valueFormatted: cd.valueFormatted, calldata: cd.calldata });
    },
  },
];
