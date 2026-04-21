export type Constructor<T, Args extends unknown[] = unknown[]> = new (...args: Args) => T;

export class Container {
  private factories = new Map<unknown, (c: Container) => unknown>();
  private instances = new Map<unknown, unknown>();
  private building = new Set<unknown>();

  add<T, Args extends unknown[]>(
    ClassRef: Constructor<T, Args>,
    factory: (c: Container) => T,
  ): void {
    this.factories.set(ClassRef, factory);
  }

  get<T extends object, Args extends unknown[]>(ClassRef: Constructor<T, Args>): T {
    if (this.instances.has(ClassRef)) {
      return this.instances.get(ClassRef) as T;
    }

    if (this.building.has(ClassRef)) {
      return this.createLazyProxy(ClassRef);
    }

    const factory = this.factories.get(ClassRef);
    if (!factory) {
      throw new Error(`Class ${ClassRef.name} is not registered in container`);
    }

    this.building.add(ClassRef);
    const instance = factory(this) as T;
    this.building.delete(ClassRef);

    this.instances.set(ClassRef, instance);
    return instance;
  }

  private createLazyProxy<T extends object, Args extends unknown[]>(
    ClassRef: Constructor<T, Args>,
  ): T {
    const getReal = (): T => {
      const real = this.instances.get(ClassRef) as T | undefined;
      if (!real) {
        throw new Error(`Lazy proxy for ${ClassRef.name} accessed before instance was created`);
      }
      return real;
    };

    return new Proxy({} as T, {
      get: (_target, prop) => {
        const real = getReal();
        const value = real[prop as keyof T];
        if (typeof value === 'function') {
          return (value as (...args: unknown[]) => unknown).bind(real);
        }
        return value;
      },
      has: (_target, prop) => {
        return prop in getReal();
      },
    });
  }
}
