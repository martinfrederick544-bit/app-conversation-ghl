import { NextRequest, NextResponse } from "next/server";
import { getMessages, markConversationRead } from "@/lib/ghl";
import { supabaseServer } from "@/lib/supabase";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const messages = await getMessages(params.id);

    // Mark any locally logged messages for this conversation as read.
    const supabase = supabaseServer();
    await supabase
      .from("messages")
      .update({ read: true })
      .eq("ghl_conversation_id", params.id)
      .eq("read", false);

    // Clear the unread badge in GHL too, since opening the conversation
    // here means the user has actually seen these messages. Awaited (not
    // fire-and-forget) — a serverless function can be frozen the instant
    // the response goes out, which would silently drop an un-awaited call.
    try {
      await markConversationRead(params.id);
    } catch (err) {
      console.error("Failed to mark conversation as read in GHL:", err);
    }

    return NextResponse.json({ messages });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
