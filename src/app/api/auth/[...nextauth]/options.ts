import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";
import bcrypt from "bcryptjs";
import getORM from "@/lib/orm";

const orm = getORM();

const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID || "",
      clientSecret: process.env.GOOGLE_SECRET || "",
    }),
    CredentialsProvider({
      name: "Credentials",
      id: "Credentials",
      credentials: {
        username: { label: "Username/email", type: "text", placeholder: "Username or email" },
        password: { label: "Password", type: "password", placeholder: "Password" },
        type: { label: "type", type: "text" },
      },
      async authorize(credentials: any): Promise<any> {
        try {
          if (!credentials.username || !credentials.password) {
            throw new Error("Missing credentials");
          }

          if (credentials.type == 1) {
            // **Login Flow**
            const user: any = await orm.user.findUnique({
              where: {
                OR: [{ email: credentials.username }, { username: credentials.username }],
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

            schema.parse({ email: credentials.username, password: credentials.password });

            const existingUser = await orm.user.findUnique({ 
                where:
                 { email: credentials.username } });
            if (existingUser) throw new Error("User already exists");

            const hash = await bcrypt.hash(credentials.password, 10);

            const newUser = await orm.user.create({
              data: {
                email: credentials.username,
                password: hash,
                isVerified: false,
              },
            });

            return newUser;
          }
        } catch (err: any) {
          throw new Error(err.message);
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
    strategy: "jwt" as "jwt",
  },

  callbacks: {
    async signIn({ user, account }: any) {
      const provider = account.provider;

      if (provider === "google") {
        await orm.user.upsert({
          where: { email: user.email },
          update: { name: user.name },
          create: { email: user.email, name: user.name },
        });
      } else if (provider === "email") {
        const existingUser = await orm.user.findUnique({ where: { email: user.email } });
        if (!existingUser) throw new Error("User doesn't exist");

        await orm.user.update({
          where: { email: user.email },
          data: { isVerified: true },
        });
      }
      return user;
    },

    async session({ session, token }: { session: any; token: any }) {
      session.user.id = token.id;
      return session;
    },

    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },

  secret: process.env.AUTH_SECRET,
  debug: false,
};

export default authOptions;
