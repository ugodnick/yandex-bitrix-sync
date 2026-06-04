import { YandexFleetDriverProfileAccount } from './yandex-fleet-profile.type';
import { YandexFleetProfileEntity } from './yandex-fleet-profile.entity';

export function getCurrentAccountBalance(
  accounts: YandexFleetDriverProfileAccount[] | undefined,
): string | null {
  const current = accounts?.find((account) => account.type === 'current');
  return current?.balance ?? null;
}

export function applyBalanceToProfile(
  profile: YandexFleetProfileEntity,
  accounts: YandexFleetDriverProfileAccount[] | undefined,
): boolean {
  const balance = getCurrentAccountBalance(accounts);
  if (balance == null || balance === '' || profile.balance === balance) return false;

  profile.balance = balance;
  profile.balanceSyncedAt = new Date();
  return true;
}
