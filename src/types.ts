export enum RaffleStatus {
  UPCOMING = 0,
  ACTIVE = 1,
  ENDED = 2,
  DRAWN = 3,
  CANCELLED = 4,
  CLAIMED = 5,
}

export interface RaffleAction {
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

export interface RaffleActions {
  join?: RaffleAction;
  draw?: RaffleAction;
  claim?: RaffleAction;
  cancel?: RaffleAction;
  withdrawRefund?: RaffleAction;
}

export interface Raffle {
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

export interface RaffleDetail extends Raffle {
  participants?: string[];
  vrfRequestId?: string;
  randomResult?: string;
  winnerIndex?: number;
  actions?: RaffleActions;
}

export interface RaffleList {
  raffles: Raffle[];
  total: number;
  limit: number;
  offset: number;
}

export interface PlatformConfig {
  chainId: number;
  chainName: string;
  factoryAddress: string;
  rpcUrl: string;
  explorerUrl: string;
  statusEnum: Record<string, string>;
  validationRules?: Record<string, unknown>;
  abis?: Record<string, unknown[]>;
}

export interface CreateRaffleParams {
  title: string;
  description: string;
  entryFee: string;
  deadline: number;
  maxParticipants?: number;
  prizeDescription?: string;
  creatorCommissionBps?: number;
}

export interface CalldataResponse {
  to: string;
  value: string;
  valueFormatted?: string;
  calldata: string;
  function: string;
  args?: Record<string, unknown>;
  estimatedGas?: string;
}

export interface ListRafflesParams {
  status?: "upcoming" | "active" | "ended" | "drawn" | "cancelled" | "claimed";
  creator?: string;
  limit?: number;
  offset?: number;
}

export class MoltraffleError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly details?: string[]
  ) {
    super(message);
    this.name = "MoltraffleError";
  }
}
