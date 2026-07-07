import { NextRequest, NextResponse } from "next/server";
import { searchConversations } from "@/lib/ghl";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || undefined;
    const status = (searchParams.get("status") as "read" | "unread" | "all") || "all";

    const conversations = await searchConversations({ query, status });
    return NextResponse.json({ conversations });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
