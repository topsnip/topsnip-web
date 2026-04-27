import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  // Canonical domain: redirect non-www to www (production only)
  const hostname = request.nextUrl.hostname;
  if (
    hostname === "topsnip.co" &&
    !hostname.includes("localhost") &&
    !hostname.endsWith(".vercel.app")
  ) {
    const canonicalUrl = request.nextUrl.clone();
    canonicalUrl.hostname = "www.topsnip.co";
    canonicalUrl.port = "";
    return NextResponse.redirect(canonicalUrl, 301);
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
