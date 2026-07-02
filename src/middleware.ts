import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;
  const isAuthExempt = pathname === "/login" || pathname.startsWith("/auth/");

  if (!user) {
    if (isAuthExempt) return supabaseResponse;

    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user.email?.toLowerCase() !== process.env.ALLOWED_EMAIL?.toLowerCase()) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "?error=not-allowed";

    const redirectResponse = NextResponse.redirect(url);

    // Bind a client to the redirect response so the sign-out's Set-Cookie
    // headers actually reach the browser (the response returned here
    // replaces `supabaseResponse`, so its cookie jar must carry them).
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              redirectResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );
    await supabase.auth.signOut();

    return redirectResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|manifest\\.webmanifest|icons/|api/webhooks/twilio|api/cron/reminders).*)",
  ],
};
