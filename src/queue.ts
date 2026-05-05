export class Queue {
  pending = new Set<string>();
  syncQueue: Promise<void> = Promise.resolve();

  constructor(private queueName: string) {}

  enqueue(name: string, task: () => Promise<void>): void {
    if (this.pending.has(name)) {
      console.log(`[${this.queueName}] Пропуск ${name}: уже в очереди.`);
      return;
    }

    this.pending.add(name);

    this.syncQueue = this.syncQueue
      .then(async () => {
        this.pending.delete(name);
        console.log(`[${this.queueName}] Старт: ${name}`);
        try {
          await task();
          console.log(`[${this.queueName}] Завершён: ${name}`);
        } catch (error) {
          console.error(`[${this.queueName}] Ошибка в ${name}:`, error);
        }
      })
      .catch(() => {});
  }
}
