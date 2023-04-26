import "lucia-auth/polyfill/node";

import prismaAdapter from "@lucia-auth/adapter-prisma";
import lucia from "lucia-auth";

import { prisma } from "../prisma";
import { edge } from "./middleware";

export const luciaEnv = process.env.NODE_ENV === "development" ? "DEV" : "PROD";

export const auth = lucia({
  adapter: prismaAdapter(prisma),
  env: luciaEnv,
  middleware: edge(),
  transformDatabaseUser: (userData) => {
    return {
      userId: userData.id,
      username: userData.username,
      address: userData.address,
    };
  },
});

export type Auth = typeof auth;