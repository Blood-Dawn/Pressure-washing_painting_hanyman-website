// =============================================================================
// lib/auth.ts
//
// Authentication helpers used by NextAuth and API route middleware.
//
// HOW NEXTAUTH WORKS IN THIS PROJECT:
//   1. Admin visits /admin/dashboard
//   2. Next.js middleware (or the page itself) checks for a valid session
//   3. If no session, they are redirected to /api/auth/signin
//   4. They enter email + password
//   5. NextAuth calls the `authorize` function below to validate credentials
//   6. If valid, NextAuth creates an encrypted JWT session cookie
//   7. On every subsequent request, getServerSession() reads the cookie
//      and returns the session data without hitting the database
//
// WHO IMPORTS THIS FILE:
//   app/api/auth/[...nextauth]/route.ts -- uses authOptions (NextAuth config)
//   app/api/bookings/[id]/route.ts      -- uses getServerSession(authOptions)
//   app/admin/layout.tsx                -- uses getServerSession(authOptions)
//
// THIS FILE IMPORTS:
//   next-auth                           -- session management
//   bcryptjs                            -- password comparison
//   lib/db.ts                           -- getUserByEmail
// =============================================================================

import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getUserByEmail } from "@/lib/db";


/**
 * authOptions
 * The full NextAuth configuration object.
 * This is exported from here AND from the API route so that both
 * getServerSession() calls (in server components) and the auth API endpoint
 * use identical configuration.
 */
export const authOptions: NextAuthOptions = {
  // ── Strategy ───────────────────────────────────────────────────────────────
  // 'jwt' stores the session in a signed/encrypted cookie, not the database.
  // This means we do NOT need a sessions table in Supabase.
  // The JWT is signed with NEXTAUTH_SECRET so it cannot be forged.
  session: {
    strategy: "jwt",
    maxAge:   30 * 60,   // Session expires after 30 minutes of inactivity
  },

  // ── Pages ──────────────────────────────────────────────────────────────────
  // Override the default NextAuth UI with our own pages.
  pages: {
    signIn: "/admin/login",   // Where admins are redirected when not logged in
    error:  "/admin/login",   // Where auth errors redirect to
  },

  // ── Providers ──────────────────────────────────────────────────────────────
  // We use only email/password (CredentialsProvider).
  // No OAuth (Google, GitHub, etc.) needed for a single-admin site.
  providers: [
    CredentialsProvider({
      name: "Email and Password",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },

      /**
       * authorize
       * Called when an admin submits the login form.
       * Must return a user object on success, or null on failure.
       * NextAuth handles the session creation after this returns.
       *
       * @param credentials  - The email and password from the login form
       */
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Look up the user by email. Returns null if not found.
        const user = await getUserByEmail(credentials.email);
        if (!user) return null;

        // bcrypt.compare hashes the provided password and checks it against
        // the stored hash WITHOUT ever decrypting the stored hash.
        // This is the correct way to verify bcrypt passwords.
        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.password
        );
        if (!passwordMatch) return null;

        // Return only what we want stored in the JWT.
        // NEVER include the password hash in the returned object.
        return {
          id:    user.id,
          email: user.email,
          name:  user.name,
        };
      },
    }),
  ],

  // ── Callbacks ──────────────────────────────────────────────────────────────
  // Callbacks let you customize what data is stored in the token and session.
  callbacks: {
    /**
     * jwt callback
     * Called when the JWT is created (at login) and when it is read.
     * We add the user's id to the token so we can access it in server components.
     */
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id; // Persist the user ID inside the JWT
      }
      return token;
    },

    /**
     * session callback
     * Called when getServerSession() is called in a component or API route.
     * We expose token.id as session.user.id so components can log audit events.
     */
    async session({ session, token }) {
      if (session.user && token.id) {
        (session.user as { id?: string }).id = token.id as string;
      }
      return session;
    },
  },
};


/**
 * hashPassword
 * Hashes a plain-text password using bcrypt with 12 salt rounds.
 * This is only used when creating or resetting an admin account.
 * 12 rounds means each hash takes ~250ms, making brute-force attacks slow.
 *
 * @param plain  - The plain text password to hash
 * @returns        The bcrypt hash string to store in the database
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}
