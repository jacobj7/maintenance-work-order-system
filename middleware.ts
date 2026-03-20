import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  const isDashboard =
    pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const isWorkOrders = pathname.startsWith("/work-orders");
  const isAssets = pathname.startsWith("/assets");

  const isProtected = isDashboard || isWorkOrders || isAssets;

  if (!isProtected) {
    return NextResponse.next();
  }

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(loginUrl);
  }

  const role = token.role as string | undefined;

  if (isDashboard) {
    if (role !== "manager") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  if (isWorkOrders) {
    const allowed = ["manager", "technician", "requestor"];
    if (!role || !allowed.includes(role)) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  if (isAssets) {
    const allowed = ["manager", "technician"];
    if (!role || !allowed.includes(role)) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/work-orders/:path*",
    "/assets/:path*",
  ],
};
