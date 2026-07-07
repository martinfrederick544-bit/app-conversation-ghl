import { NextRequest, NextResponse } from "next/server";
import { getMessages } from "@/lib/ghl";
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

    return NextResponse.json({ messages });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
