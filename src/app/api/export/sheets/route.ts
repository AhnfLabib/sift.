// Session-authed trigger for the Google Sheets export. The middleware auth
// wall also covers this path, but the route re-checks the user itself so it
// never depends on matcher config staying in sync.

import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { exportToSheets } from "@/lib/sheets/export";

// Never cache: every call re-reads the ledger and rewrites the sheet.
export const dynamic = "force-dynamic";

export async function POST(): Promise<NextResponse> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await exportToSheets();
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Export failed. Try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
