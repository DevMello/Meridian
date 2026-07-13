import { NextResponse } from "next/server";
import { z } from "zod";
import { search } from "@/lib/domain/coordinator";
import { searchQuerySchema } from "@/lib/domain/models";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  keyword: z.string().min(1),
  providers: z.array(z.string()).nullish(),
  manufacturer: z.string().nullish(),
  category: z.string().nullish(),
  in_stock_only: z.boolean().optional(),
  max_results_per_provider: z.number().int().optional(),
});

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const b = parsed.data;

  const query = searchQuerySchema.parse({
    keyword: b.keyword,
    manufacturer: b.manufacturer ?? null,
    category: b.category ?? null,
    in_stock_only: b.in_stock_only ?? false,
    max_results: Math.max(1, Math.min(b.max_results_per_provider ?? 10, 50)),
  });

  const result = await search(query, b.providers ?? null);
  return NextResponse.json(result);
}
