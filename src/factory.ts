import type { BaseModel } from '@stravigor/database'

type ModelClass = typeof BaseModel & { create(attrs: Record<string, unknown>): Promise<any> }
type DefinitionFn = (seq: number) => Record<string, unknown>

/**
 * Lightweight model factory for test seeding.
 *
 * @example
 * const UserFactory = Factory.define(User, (seq) => ({
 *   pid: crypto.randomUUID(),
 *   name: `User ${seq}`,
 *   email: `user-${seq}@test.com`,
 *   passwordHash: 'hashed',
 * }))
 *
 * const user = await UserFactory.create()
 * const users = await UserFactory.createMany(5)
 * const user = await UserFactory.create({ name: 'Custom' })
 * const instance = UserFactory.make()  // in-memory, no DB
 */
export class Factory<T extends BaseModel = BaseModel> {
  private static _seq = new Map<Function, number>()

  private constructor(
    private model: ModelClass,
    private definition: DefinitionFn
  ) {}

  /** Define a factory for a model class. */
  static define<M extends BaseModel>(
    model: typeof BaseModel,
    definition: (seq: number) => Record<string, unknown>
  ): Factory<M> {
    return new Factory<M>(model as ModelClass, definition)
  }

  private nextSeq(): number {
    const current = Factory._seq.get(this.model) ?? 0
    const next = current + 1
    Factory._seq.set(this.model, next)
    return next
  }

  /** Create and persist a single record. */
  async create(overrides?: Record<string, unknown>): Promise<T> {
    const attrs = { ...this.definition(this.nextSeq()), ...overrides }
    return this.model.create(attrs) as Promise<T>
  }

  /** Create and persist multiple records. */
  async createMany(count: number, overrides?: Record<string, unknown>): Promise<T[]> {
    return Promise.all(Array.from({ length: count }, () => this.create(overrides)))
  }

  /** Build an in-memory instance without persisting to the database. */
  make(overrides?: Record<string, unknown>): T {
    const attrs = { ...this.definition(this.nextSeq()), ...overrides }
    const instance = new (this.model as any)()
    instance.merge(attrs)
    return instance as T
  }

  /** Reset all factory sequences (call between test suites if needed). */
  static resetSequences(): void {
    Factory._seq.clear()
  }
}
