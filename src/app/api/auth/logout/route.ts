import { NextResponse } from "next/server";
import { writeSessionUpdate } from "@/data/session/sessionCookies";

/** Ends the session by clearing both session cookies. */
export function POST() {
  const response = new NextResponse(null, { status: 204 });
  writeSessionUpdate(response.cookies, { _tag: "Ended" });
  return response;
}
