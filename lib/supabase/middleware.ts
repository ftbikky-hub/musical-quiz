import { NextResponse, type NextRequest } from "next/server";
import { JOURNAL_MEMBER_COOKIE, isMemberId } from "@/lib/member-names";

/**
 * 個人・知人用の名前選択ゲート。パスワードによる本人認証は行わない。
 * CookieのUUIDをここで確認し、実在するプロフィールかは各レイアウト・更新処理で確認する。
 */
export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const protectedPage = ["/theater-log", "/archive"].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const id = request.cookies.get(JOURNAL_MEMBER_COOKIE)?.value ?? "";
  if (protectedPage && !isMemberId(id)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("redirectTo", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }
  // 名前を選択済みでも /login に入れる（名前の切り替えに使う）。
  return NextResponse.next();
}
