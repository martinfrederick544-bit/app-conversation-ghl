import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.GHL_API_BASE || "https://services.leadconnectorhq.com";
const API_VERSION = process.env.GHL_API_VERSION || "2021-07-28";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const locationId = process.env.GHL_LOCATION_ID;
  const apiKey = process.env.GHL_API_KEY;
  if (!locationId || !apiKey) {
    return NextResponse.json({ error: "GHL n'est pas configuré" }, { status: 500 });
  }

  const res = await fetch(
    `${API_BASE}/conversations/messages/${params.id}/locations/${locationId}/recording`,
    {
      headers: { Authorization: `Bearer ${apiKey}`, Version: API_VERSION },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    return NextResponse.json({ error: "Aucun enregistrement disponible" }, { status: 404 });
  }

  const buffer = await res.arrayBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": res.headers.get("content-type") || "audio/wav",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
