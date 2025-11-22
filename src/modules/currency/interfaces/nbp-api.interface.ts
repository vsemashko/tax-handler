export interface NbpRate {
  no: string;
  effectiveDate: string;
  mid: number;
  bid?: number;
  ask?: number;
}

export interface NbpTableResponse {
  table: string;
  currency: string;
  code: string;
  rates: NbpRate[];
}

export interface NbpRateResponse {
  table: string;
  currency: string;
  code: string;
  rates: NbpRate[];
}

export interface NbpTableListResponse {
  table: string;
  no: string;
  effectiveDate: string;
  rates: Array<{
    currency: string;
    code: string;
    mid: number;
    bid?: number;
    ask?: number;
  }>;
}
