interface UisLimits {
  minute_reset?: number;
  minute_remaining?: number;
}

const SKIP_MNEMONICS = new Set([
  'method_component_disabled',
  'parameter_component_disabled',
  'method_not_found',
  'forbidden',
]);

export class UisApiError extends Error {
  constructor(
    message: string,
    readonly code: number,
    readonly mnemonic: string,
    readonly limits?: UisLimits,
  ) {
    super(message);
    this.name = 'UisApiError';
  }

  get isSkippable(): boolean {
    return SKIP_MNEMONICS.has(this.mnemonic);
  }

  get isRateLimit(): boolean {
    return this.code === -32029 || this.mnemonic === 'limit_exceeded';
  }

  retryAfterMs(): number {
    const reset = this.limits?.minute_reset;
    if (typeof reset === 'number' && Number.isFinite(reset)) {
      const nowSec = Date.now() / 1000;
      if (reset > nowSec && reset < nowSec + 3600) {
        return Math.min((reset - nowSec) * 1000 + 1000, 120_000);
      }
      if (reset > 0 && reset <= 120) {
        return reset * 1000;
      }
    }
    return 60_000;
  }
}

export function toUisApiError(error: unknown): UisApiError {
  const body = error as {
    code?: number;
    message?: string;
    data?: { mnemonic?: string; metadata?: { limits?: UisLimits } };
  };
  return new UisApiError(
    body.message || 'UIS API error',
    body.code ?? 0,
    body.data?.mnemonic ?? '',
    body.data?.metadata?.limits,
  );
}
