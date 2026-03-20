import type { DrizzleClient } from '../index';

export abstract class BaseRepository<
  TEntity,
  TCreateInput,
  TUpdateInput,
  TFilters = Record<string, unknown>,
> {
  constructor(protected readonly db: DrizzleClient) {}

  abstract findAll(userId: string, filters?: TFilters): Promise<readonly TEntity[]>;
  abstract findById(userId: string, id: string): Promise<TEntity | null>;
  abstract create(userId: string, input: TCreateInput): Promise<TEntity>;
  abstract update(userId: string, id: string, input: TUpdateInput): Promise<TEntity>;
  abstract delete(userId: string, id: string): Promise<void>;

  protected freeze<T extends object>(obj: T): Readonly<T> {
    return Object.freeze(obj);
  }

  protected freezeAll<T extends object>(items: T[]): readonly Readonly<T>[] {
    return Object.freeze(items.map((item) => this.freeze(item)));
  }
}
