import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";
import bcrypt from "bcryptjs";
import orm from "@/lib/orm";
import NextAuth, { SessionStrategy } from "next-auth";

async function shortHash(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  
  return Array.from(new Uint8Array(hashBuffer))
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('')
      .substring(0, 6); 
}


export const handlers = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),

    CredentialsProvider({
      name: "Credentials",
      id: "Credentials",

      credentials: {
        username: {
          label: "Username/email",
          type: "text",
          placeholder: "Username or email",
        },
        password: {
          label: "Password",
          type: "password",
          placeholder: "Password",
        },
        type: { label: "type", type: "text" },
      },

      async authorize(credentials: any): Promise<any> {
        try {
          if (!credentials?.username || !credentials?.password) {
            throw new Error("Missing credentials");
          }

          if (credentials.type == 1) {
            // **Login Flow**
            const user = await orm.user.findUnique({
              where: {
                email: credentials.username,
              },
            });

            if (!user) throw new Error("User not found");

            const isPassTrue = user.password && (await bcrypt.compare(credentials.password, user.password));
            if (!isPassTrue) throw new Error("Invalid password");

            return user;
          } else {
            // **Signup Flow**
            const schema = z.object({
              email: z.string().email(),
              password: z.string().min(8),
            });

            schema.parse({
              email: credentials.username,
              password: credentials.password,
            });

            const existingUser = await orm.user.findUnique({
              where: { email: credentials.username },
            });
            if (existingUser) throw new Error("User already exists");

            const hash = await bcrypt.hash(credentials.password, 10);

            const newUser = await orm.user.create({
              data: {
                email: credentials.username,
                username:`${credentials.username.split("@")[0]}${shortHash(credentials.username)}`
                ,
                password: hash,
                isVerified: false,
              },
            });

            return newUser;
          }
        } catch (err: any) {
          console.error("Error during authorization:", err.message);
          throw new Error(err.message);  // Rethrow to propagate the error to NextAuth
        }
      },
    }),
  ],

  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
    verifyRequest: "/auth/verify",
  },

  session: {
    strategy: "jwt" as SessionStrategy,
  },

  callbacks: {
    async signIn({ user, account }: any) {
      try {
        const provider = account.provider;

        if (provider === "google") {
          await orm.user.upsert({
            where: { email: user.email },
            update: { name: user.name },
            create: { 
              email: user.email,
              name: user.name, 
              username: `${user.email.split("@")[0]}${shortHash(user.email)}`,
            },
          });

        } else if (provider === "credentials") {
          const existingUser = await orm.user.findUnique({
            where: { email: user.email },
          });
          if (!existingUser) throw new Error("User doesn't exist");

          await orm.user.update({
            where: { email: user.email },
            data: { isVerified: true },
          });
        }
        return true;
      } catch (err: any) {
        console.error("Error during signIn callback:", err.message);
        throw new Error("Auth Failed")  // Prevent login on error
      }
    },

    async session({ session, token }: { session: any; token: any }) {
      try {
        if (token?.id) {
          session.user.id = token.id;
        }
        return session;
      } catch (err: any) {
        console.error("Error during session callback:", err.message);
        return session;
      }
    },

    async jwt({ token, user }: { token: any; user: any }) {
      try {
        if (user) {
          token.id = user.id;
        }
        return token;
      } catch (err: any) {
        console.error("Error during JWT callback:", err.message);
        return token;
      }
    },
  },

  secret: process.env.AUTH_SECRET,
  debug: false,
});

