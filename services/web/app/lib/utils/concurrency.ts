/**
 * Semaphore-based concurrency limiter for rate-limiting parallel operations.
 * Allows N concurrent operations, with slots freed as they complete (no head-of-line blocking).
 *
 * Usage:
 *   const limiter = new ConcurrencyLimiter(5, 50)
 *   const results = await Promise.all(items.map(item =>
 *     limiter.run(() => fetchData(item))
 *   ))
 */
export class ConcurrencyLimiter {
  private running = 0
  private readonly queue: Array<() => void> = []

  /**
   * @param limit Maximum number of concurrent operations
   * @param minIntervalMs Minimum time between starting new operations (optional)
   */
  constructor(
    private readonly limit: number,
    private readonly minIntervalMs: number = 0
  ) {
    if (limit < 1) {
      throw new Error('ConcurrencyLimiter limit must be at least 1')
    }
  }

  /**
   * Acquire a slot. Resolves when a slot is available.
   */
  async acquire(): Promise<void> {
    if (this.running < this.limit) {
      this.running++
      if (this.minIntervalMs > 0) {
        await this.delay(this.minIntervalMs)
      }
      return
    }

    // Wait in queue for a slot
    await new Promise<void>(resolve => this.queue.push(resolve))
    this.running++

    if (this.minIntervalMs > 0) {
      await this.delay(this.minIntervalMs)
    }
  }

  /**
   * Release a slot, allowing the next queued operation to proceed.
   */
  release(): void {
    this.running--
    const next = this.queue.shift()
    if (next) {
      next()
    }
  }

  /**
   * Run an async function with concurrency limiting.
   * Automatically acquires and releases a slot.
   */
  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire()
    try {
      return await fn()
    } finally {
      this.release()
    }
  }

  /**
   * Current number of running operations.
   */
  get activeCount(): number {
    return this.running
  }

  /**
   * Number of operations waiting in the queue.
   */
  get pendingCount(): number {
    return this.queue.length
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
