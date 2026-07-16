import { NextRequest, NextResponse } from "next/server";
import { sendMessage } from "@/lib/ghl";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { contactId, channel, message, subject, cc, attachments } = body;

    if (!contactId || !channel || !message) {
      return NextResponse.json(
        { error: "contactId, channel and message are required" },
        { status: 400 }
      );
    }
    if (channel !== "sms" && channel !== "email") {
      return NextResponse.json({ error: "channel must be 'sms' or 'email'" }, { status: 400 });
    }

    const ccList: string[] = Array.isArray(cc)
      ? cc
      : typeof cc === "string"
      ? cc.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];

    const result = await sendMessage({
      contactId,
      channel,
      body: message,
      subject,
      cc: ccList,
      attachments: Array.isArray(attachments) ? attachments : undefined,
    });
    return NextResponse.json({ ok: true, result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
