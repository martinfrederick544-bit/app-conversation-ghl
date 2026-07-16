import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { sendVoiceMessage } from "@/lib/ghl";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const contactId = formData.get("contactId");
    const audio = formData.get("audio");

    if (typeof contactId !== "string" || !contactId || !(audio instanceof File)) {
      return NextResponse.json({ error: "contactId et audio sont requis" }, { status: 400 });
    }

    const supabase = supabaseServer();
    const extension = audio.type.includes("mp4") ? "m4a" : "webm";
    const filename = `${contactId}-${Date.now()}.${extension}`;
    const buffer = Buffer.from(await audio.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("voice-notes")
      .upload(filename, buffer, {
        contentType: audio.type || "audio/webm",
        upsert: false,
      });
    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from("voice-notes").getPublicUrl(filename);

    const result = await sendVoiceMessage({ contactId, audioUrl: publicUrl });
    return NextResponse.json({ ok: true, result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
