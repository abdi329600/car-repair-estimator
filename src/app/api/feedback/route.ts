import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { estimate_id, accuracy, timestamp } = await req.json();

    // Log to console for now (later: save to Supabase)
    console.log("[feedback]", {
      estimate_id,
      accuracy,
      timestamp,
    });

    // TODO: Save to database when Supabase is set up
    // await supabase.from('feedback').insert({
    //   estimate_id,
    //   accuracy,
    //   created_at: timestamp,
    // });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[feedback] Error:", error);
    return NextResponse.json(
      { error: "Failed to save feedback" },
      { status: 500 }
    );
  }
}
