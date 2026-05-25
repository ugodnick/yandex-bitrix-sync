export interface YandexFleetTransaction {
  id: string;
  event_at: string;
  category_id: string;
  category_name: string;
  amount: string;
  currency_code: string;
  description?: string;
  driver_profile_id: string;
  order_id?: string;
  event_id?: string;
}

export interface YandexFleetTransactionsResponse {
  transactions: YandexFleetTransaction[];
  limit: number;
  cursor: string;
}
