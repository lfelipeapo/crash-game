import { Round } from "../entities/round.entity";

export interface IRoundRepository {
  create(round: Round): Promise<void>;
  findById(id: string): Promise<Round | null>;
  findCurrent(): Promise<Round | null>;
  findHistory(limit: number, offset: number): Promise<{ rounds: Round[]; total: number }>;
  save(round: Round): Promise<void>;
}
