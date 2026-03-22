// middleware.ts
// Runs on every request before the page renders.
// Protects /admin/* routes by checking for a valid session.
// The login page (/admin/login) is excluded so it doesn't loop.

import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/admin/login",
  },
});

// Only run this middleware on /admin routes, but NOT /admin/login
export const config = {
  matcher: ["/admin/dashboard/:path*", "/admin/settings/:path*"],
};
