export type PretiumAsset = 'USDC' | 'USDT' | 'cUSD';

export interface PretiumNetwork {
  code: string;
  name: string;
  type: 'mobile_money' | 'bank';
  country: string;
}

export interface PretiumStatusResponse {
  id?: number;
  transaction_code: string;
  status: string;
  message?: string;
  amount?: string;
  currency_code?: string;
}

export interface PretiumExchangeRateResponse {
  buying_rate: number;
  selling_rate: number;
  quoted_rate: number;
}
