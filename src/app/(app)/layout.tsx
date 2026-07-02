import type { ReactNode } from "react";

import TopBar from "@/components/TopBar";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * Shell for every signed-in route: sticky top bar + the page below it.
 * Auth itself is enforced by middleware — this layout can assume a session.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getUser();
  const accountInitial = (data.user?.email?.trim()[0] ?? "?").toUpperCase();

  return (
    <>
      <TopBar accountInitial={accountInitial} />
      {children}
    </>
  );
}
