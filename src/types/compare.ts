export interface ItemPriceEntry {
  merchant: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  count: number;
  lastDate: string;
  notes?: string;
}

export interface ItemPriceComparison {
  canonical: string;
  entries: ItemPriceEntry[];
}
