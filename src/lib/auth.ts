import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import clientPromise from '@/lib/mongodb';

console.log('[Auth] NextAuth configuration loading');

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
        console.log('[Auth] Authorize called with credentials:', credentials?.email);
        
        if (!credentials?.email || !credentials?.password) {
          console.log('[Auth] Missing email or password');
          return null;
        }
        
        try {
          console.log('[Auth] Connecting to MongoDB');
          const client = await clientPromise;
          const db = client.db(process.env.MONGODB_DB);
          console.log('[Auth] Searching for user with email:', credentials.email);
          
          const user = await db.collection('users').findOne({ email: credentials.email });
          console.log('[Auth] User fetch result:', user ? 'Found' : 'Not found');
          
          if (!user) {
            console.log('[Auth] User not found');
            return null;
          }
          
          console.log('[Auth] Comparing password');
          const ok = await compare(credentials.password, user.passwordHash || '');
          console.log('[Auth] Password comparison result:', ok);
          
          if (!ok) {
            console.log('[Auth] Password invalid');
            return null;
          }
          
          console.log('[Auth] Authentication successful for user:', user.email);
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
      console.log('[Auth] JWT callback called', { token: !!token, user: !!user });
      
      if (user) {
        console.log('[Auth] Setting user data in token');
        token.role = (user as any).role || 'agent';
        token.uid = (user as any).id;
      }
      
      console.log('[Auth] JWT callback completed');
      return token;
    },
    async session({ session, token }) {
      console.log('[Auth] Session callback called');
      
      if (session.user) {
        console.log('[Auth] Setting user data in session');
        (session.user as any).role = token.role || 'agent';
        (session.user as any).id = token.uid as string;
      }
      
      console.log('[Auth] Session callback completed');
      return session;
    },
  },
};

export const { auth } = NextAuth(authOptions);

console.log('[Auth] NextAuth configuration loaded');