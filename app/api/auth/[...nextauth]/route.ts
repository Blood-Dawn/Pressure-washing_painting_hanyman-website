// =============================================================================
// app/api/auth/[...nextauth]/route.ts
//
// The NextAuth API endpoint. The [...nextauth] folder name (called a "catch-all
// route" in Next.js) means this file handles ALL requests to:
//   /api/auth/signin
//   /api/auth/signout
//   /api/auth/session
//   /api/auth/callback/credentials
//   ...and all other NextAuth sub-routes
//
// All we do here is import authOptions from lib/auth.ts and hand it to
// NextAuth. The logic itself (password check, session creation) is in lib/auth.ts.
//
// WHO CALLS THIS FILE:
//   The browser -- when the admin submits the login form
//   next-auth   -- internally when validating session cookies
//   getServerSession(authOptions) -- called in server components/routes
//
// THIS FILE IMPORTS:
//   next-auth             -- the NextAuth handler
//   lib/auth.ts           -- our authOptions configuration
// =============================================================================

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// NextAuth returns an object with { GET, POST } handlers.
// We export them under those names so Next.js routes GET and POST requests
// to the same handler.
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
