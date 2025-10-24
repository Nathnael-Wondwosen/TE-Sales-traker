import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import clientPromise from '@/lib/mongodb';

if (process.env.NODE_ENV === 'development') {
  console.log('[Auth] NextAuth configuration loaded');
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { 
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production', // Only secure in production
        maxAge: 30 * 24 * 60 * 60,
      }
    }
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[Auth] Authorize called');
        }
        if (!credentials?.email || !credentials?.password) {
          if (process.env.NODE_ENV === 'development') console.log('[Auth] Missing email or password');
          return null;
        }
        
        try {
          const client = await clientPromise;
          const db = client.db(process.env.MONGODB_DB);
          if (process.env.NODE_ENV === 'development') console.log('[Auth] Searching for user');
          const user = await db.collection('users').findOne({ email: credentials.email });
          if (process.env.NODE_ENV === 'development') console.log('[Auth] User fetched');
          if (!user) {
            if (process.env.NODE_ENV === 'development') console.log('[Auth] User not found');
            return null;
          }
          if (process.env.NODE_ENV === 'development') console.log('[Auth] Comparing password');
          const ok = await compare(credentials.password, user.passwordHash || '');
          if (process.env.NODE_ENV === 'development') console.log('[Auth] Password comparison result:', ok);
          if (!ok) {
            if (process.env.NODE_ENV === 'development') console.log('[Auth] Password invalid');
            return null;
          }
          if (process.env.NODE_ENV === 'development') console.log('[Auth] Authentication successful');
          return {
            id: String(user._id),
            name: user.name || user.email,
            email: user.email,
            role: user.role || 'agent',
          } as any;
        } catch (error) {
          console.error('[Auth] Authorization error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (process.env.NODE_ENV === 'development') console.log('[Auth] JWT callback');
      if (user) {
        token.role = (user as any).role || 'agent';
        token.uid = (user as any).id;
      }
      return token;
    },
    async session({ session, token }) {
      if (process.env.NODE_ENV === 'development') console.log('[Auth] Session callback');
      if (session.user) {
        (session.user as any).role = token.role || 'agent';
        (session.user as any).id = token.uid as string;
      }
      return session;
    },
  },
};

export const { auth } = NextAuth(authOptions);