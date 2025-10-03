import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";

const authOptions: NextAuthOptions = {
  providers: [
    {
      id: "dex",
      name: "Company SSO",
      type: "oauth",
      authorization: {
        url: "http://localhost:5556/dex/auth",
        params: {
          scope: "openid email profile offline_access",
        },
      },
      token: "http://host.docker.internal:5556/dex/token",
      userinfo: "http://host.docker.internal:5556/dex/userinfo",
      jwks_endpoint: "http://host.docker.internal:5556/dex/keys",
      issuer: process.env.DEX_ISSUER || "http://host.docker.internal:5556/dex",

      clientId: process.env.DEX_CLIENT_ID!,
      clientSecret: process.env.DEX_CLIENT_SECRET!,

      checks: ["state"],

      profile(profile) {
        return {
          id: profile.sub,
          email: profile.email,
          name: profile.name,
          image: profile.picture,
        };
      },
    },
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.department = profile?.department;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  debug: true,
  pages: {
    error: "/auth/error",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
