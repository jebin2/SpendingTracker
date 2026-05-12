import { NextResponse } from "next/server";
import { requireSession } from "@/server/http/requireSession";
import { getTransactions, getAnalysisCache, upsertAnalysisCacheRow } from "@/lib/sheets";
import { normalizeItemNames } from "@/lib/ai/normalize-items";
import type { ItemPriceComparison } from "@/types";

function fingerprint(names: string[]): string {
  return [...names].sort().join("|");
}

function buildComparisons(
  transactions: { merchant: string; amount: number; item_name?: string; date: string; notes?: string }[],
  groups: { canonical: string; variants: string[] }[]
): ItemPriceComparison[] {
  const canonMap: Record<string, string> = {};
  for (const g of groups) {
    for (const v of g.variants) canonMap[v.toLowerCase().trim()] = g.canonical;
  }

  const data: Record<string, Record<string, { prices: number[]; lastDate: string; notes?: string }>> = {};
  for (const tx of transactions) {
    if (!tx.item_name) continue;
    const canon = canonMap[tx.item_name.toLowerCase().trim()] ?? tx.item_name;
    if (!data[canon]) data[canon] = {};
    if (!data[canon][tx.merchant]) data[canon][tx.merchant] = { prices: [], lastDate: tx.date };
    data[canon][tx.merchant].prices.push(tx.amount);
    if (tx.date > data[canon][tx.merchant].lastDate) data[canon][tx.merchant].lastDate = tx.date;
    if (tx.notes) data[canon][tx.merchant].notes = tx.notes;
  }

  return Object.entries(data)
    .filter(([, merchants]) => Object.keys(merchants).length >= 2)
    .map(([canonical, merchants]) => ({
      canonical,
      entries: Object.entries(merchants)
        .map(([merchant, d]) => ({
          merchant,
          avgPrice: Math.round(d.prices.reduce((s, p) => s + p, 0) / d.prices.length),
          minPrice: Math.min(...d.prices),
          maxPrice: Math.max(...d.prices),
          count: d.prices.length,
          lastDate: d.lastDate,
          notes: d.notes,
        }))
        .sort((a, b) => a.avgPrice - b.avgPrice),
    }))
    .sort((a, b) => b.entries.length - a.entries.length);
}

export async function GET() {
  const result = await requireSession();
  if (!result.ok) return result.response;
  const { accessToken, sheetId } = result.session;

  const allTx = await getTransactions(accessToken, sheetId);
  const withItems = allTx.filter((t) => t.item_name && t.amount > 0);
  if (withItems.length === 0) return NextResponse.json({ comparisons: [], total_items: 0 });

  const uniqueNames = [...new Set(withItems.map((t) => t.item_name!))];
  const cacheKey = `item_norm_${fingerprint(uniqueNames).slice(0, 60)}`;

  const cached = await getAnalysisCache(accessToken, sheetId, cacheKey, Infinity);
  let groups: { canonical: string; variants: string[] }[];
  if (cached?.status === "done" && cached.summary_json) {
    groups = JSON.parse(cached.summary_json);
  } else {
    groups = await normalizeItemNames(uniqueNames);
    await upsertAnalysisCacheRow(accessToken, sheetId, cacheKey, "item_norm", "done", JSON.stringify(groups));
  }

  return NextResponse.json({ comparisons: buildComparisons(withItems, groups), total_items: uniqueNames.length });
}
