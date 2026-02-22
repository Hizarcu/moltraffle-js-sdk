import { z } from 'zod';

declare enum RaffleStatus {
    UPCOMING = 0,
    ACTIVE = 1,
    ENDED = 2,
    DRAWN = 3,
    CANCELLED = 4,
    CLAIMED = 5
}
interface RaffleAction {
    available: boolean;
    to?: string;
    function?: string;
    calldata?: string;
    calldata_example?: string;
    value?: string;
    note?: string;
    reason?: string;
    args?: Record<string, unknown>;
}
interface RaffleActions {
    join?: RaffleAction;
    draw?: RaffleAction;
    claim?: RaffleAction;
    cancel?: RaffleAction;
    withdrawRefund?: RaffleAction;
}
interface Raffle {
    address: string;
    title: string;
    description?: string;
    prizeDescription?: string;
    entryFee: string;
    entryFeeFormatted?: string;
    deadline: number;
    deadlineISO?: string;
    maxParticipants: number;
    currentParticipants: number;
    status: RaffleStatus;
    statusLabel?: string;
    creator: string;
    winner?: string | null;
    creatorCommissionBps: number;
    prizePool?: string;
    prizePoolFormatted?: string;
}
interface RaffleDetail extends Raffle {
    participants?: string[];
    vrfRequestId?: string;
    randomResult?: string;
    winnerIndex?: number;
    actions?: RaffleActions;
}
interface RaffleList {
    raffles: Raffle[];
    total: number;
    limit: number;
    offset: number;
}
interface PlatformConfig {
    chainId: number;
    chainName: string;
    factoryAddress: string;
    rpcUrl: string;
    explorerUrl: string;
    statusEnum: Record<string, string>;
    validationRules?: Record<string, unknown>;
    abis?: Record<string, unknown[]>;
}
interface CreateRaffleParams {
    title: string;
    description: string;
    entryFee: string;
    deadline: number;
    maxParticipants?: number;
    prizeDescription?: string;
    creatorCommissionBps?: number;
}
interface CalldataResponse {
    to: string;
    value: string;
    valueFormatted?: string;
    calldata: string;
    function: string;
    args?: Record<string, unknown>;
    estimatedGas?: string;
}
interface ListRafflesParams {
    status?: "upcoming" | "active" | "ended" | "drawn" | "cancelled" | "claimed";
    creator?: string;
    limit?: number;
    offset?: number;
}
declare class MoltraffleError extends Error {
    readonly statusCode?: number | undefined;
    readonly details?: string[] | undefined;
    constructor(message: string, statusCode?: number | undefined, details?: string[] | undefined);
}

declare class MoltraffleClient {
    private baseUrl;
    constructor(baseUrl?: string);
    private get;
    /** Return platform configuration including chain info, ABIs, and validation rules. */
    getConfig(): Promise<PlatformConfig>;
    /** List raffles with optional filtering by status, creator, and pagination. */
    listRaffles(params?: ListRafflesParams): Promise<RaffleList>;
    /** Get full details of a raffle by contract address, including available actions. */
    getRaffle(address: string): Promise<RaffleDetail>;
    /** Get encoded calldata to create a new raffle via the factory contract. */
    getCreateCalldata(params: CreateRaffleParams): Promise<CalldataResponse>;
    /** Get the join action calldata for a raffle. Throws if raffle is not joinable. */
    getJoinCalldata(raffleAddress: string): Promise<RaffleAction>;
    /** Get the drawWinner calldata. Throws if draw is not yet available. */
    getDrawCalldata(raffleAddress: string): Promise<RaffleAction>;
    /** Get the claimPrize calldata. Throws if claim is not available. */
    getClaimCalldata(raffleAddress: string): Promise<RaffleAction>;
}

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

interface AgentKitAction<TInput extends z.ZodTypeAny> {
    name: string;
    description: string;
    schema: TInput;
    invoke: (walletProvider: any, input: z.infer<TInput>) => Promise<string>;
}
declare const MOLTRAFFLE_ACTIONS: readonly [AgentKitAction<z.ZodObject<{
    status: z.ZodDefault<z.ZodEnum<["upcoming", "active", "ended", "drawn", "cancelled", "claimed"]>>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status: "upcoming" | "active" | "ended" | "drawn" | "cancelled" | "claimed";
    limit: number;
}, {
    status?: "upcoming" | "active" | "ended" | "drawn" | "cancelled" | "claimed" | undefined;
    limit?: number | undefined;
}>>, AgentKitAction<z.ZodObject<{
    address: z.ZodString;
}, "strip", z.ZodTypeAny, {
    address: string;
}, {
    address: string;
}>>, AgentKitAction<z.ZodObject<{
    title: z.ZodString;
    description: z.ZodString;
    entryFee: z.ZodString;
    deadline: z.ZodNumber;
    maxParticipants: z.ZodDefault<z.ZodNumber>;
    prizeDescription: z.ZodOptional<z.ZodString>;
    creatorCommissionBps: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    title: string;
    description: string;
    entryFee: string;
    deadline: number;
    maxParticipants: number;
    creatorCommissionBps: number;
    prizeDescription?: string | undefined;
}, {
    title: string;
    description: string;
    entryFee: string;
    deadline: number;
    prizeDescription?: string | undefined;
    maxParticipants?: number | undefined;
    creatorCommissionBps?: number | undefined;
}>>, AgentKitAction<z.ZodObject<{
    raffleAddress: z.ZodString;
    ticketCount: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    raffleAddress: string;
    ticketCount: number;
}, {
    raffleAddress: string;
    ticketCount?: number | undefined;
}>>, AgentKitAction<z.ZodObject<{
    raffleAddress: z.ZodString;
}, "strip", z.ZodTypeAny, {
    raffleAddress: string;
}, {
    raffleAddress: string;
}>>, AgentKitAction<z.ZodObject<{
    raffleAddress: z.ZodString;
}, "strip", z.ZodTypeAny, {
    raffleAddress: string;
}, {
    raffleAddress: string;
}>>];

interface AutoGPTTool {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    execute: (params: Record<string, unknown>) => Promise<string>;
}
declare const MOLTRAFFLE_AUTOGPT_TOOLS: AutoGPTTool[];

export { type CalldataResponse, type CreateRaffleParams, type ListRafflesParams, MOLTRAFFLE_ACTIONS, MOLTRAFFLE_AUTOGPT_TOOLS, MoltraffleClient, MoltraffleError, type PlatformConfig, type Raffle, type RaffleAction, type RaffleActions, type RaffleDetail, type RaffleList, RaffleStatus };
