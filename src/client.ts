import {
  CalldataResponse,
  CreateRaffleParams,
  ListRafflesParams,
  MoltraffleError,
  PlatformConfig,
  RaffleAction,
  RaffleDetail,
  RaffleList,
} from "./types";

const DEFAULT_BASE_URL = "https://moltraffle.fun";

export class MoltraffleClient {
  private baseUrl: string;

  constructor(baseUrl: string = DEFAULT_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  private async get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) url.searchParams.set(k, String(v));
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
    return data as T;
  }

  /** Return platform configuration including chain info, ABIs, and validation rules. */
  getConfig(): Promise<PlatformConfig> {
    return this.get<PlatformConfig>("/api/config");
  }

  /** List raffles with optional filtering by status, creator, and pagination. */
  listRaffles(params?: ListRafflesParams): Promise<RaffleList> {
    return this.get<RaffleList>("/api/raffles", {
      status: params?.status,
      creator: params?.creator,
      limit: params?.limit ?? 50,
      offset: params?.offset ?? 0,
    });
  }

  /** Get full details of a raffle by contract address, including available actions. */
  getRaffle(address: string): Promise<RaffleDetail> {
    return this.get<RaffleDetail>(`/api/raffle/${address}`);
  }

  /** Get encoded calldata to create a new raffle via the factory contract. */
  getCreateCalldata(params: CreateRaffleParams): Promise<CalldataResponse> {
    return this.get<CalldataResponse>("/api/factory/calldata", {
      title: params.title,
      description: params.description,
      entryFee: params.entryFee,
      deadline: params.deadline,
      maxParticipants: params.maxParticipants ?? 0,
      prizeDescription: params.prizeDescription,
      creatorCommissionBps: params.creatorCommissionBps ?? 0,
    });
  }

  /** Get the join action calldata for a raffle. Throws if raffle is not joinable. */
  async getJoinCalldata(raffleAddress: string): Promise<RaffleAction> {
    const raffle = await this.getRaffle(raffleAddress);
    const action = raffle.actions?.join;
    if (!action?.available) {
      throw new MoltraffleError(action?.reason ?? "Raffle is not joinable");
    }
    return action;
  }

  /** Get the drawWinner calldata. Throws if draw is not yet available. */
  async getDrawCalldata(raffleAddress: string): Promise<RaffleAction> {
    const raffle = await this.getRaffle(raffleAddress);
    const action = raffle.actions?.draw;
    if (!action?.available) {
      throw new MoltraffleError(action?.reason ?? "Draw not yet available");
    }
    return action;
  }

  /** Get the claimPrize calldata. Throws if claim is not available. */
  async getClaimCalldata(raffleAddress: string): Promise<RaffleAction> {
    const raffle = await this.getRaffle(raffleAddress);
    const action = raffle.actions?.claim;
    if (!action?.available) {
      throw new MoltraffleError(action?.reason ?? "Claim not available");
    }
    return action;
  }
}
