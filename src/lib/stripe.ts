import "server-only";

import Stripe from "stripe";

import { serverEnv } from "@/lib/env/server";

/**
 * Cliente de Stripe (solo servidor, solo claves de modo test: el esquema de
 * env rechaza `sk_live_…`). La versión de la API la fija el SDK.
 */
let client: Stripe | undefined;

export function stripe(): Stripe {
  client ??= new Stripe(serverEnv("STRIPE_SECRET_KEY"), {
    appInfo: { name: "ATELIER" },
    maxNetworkRetries: 2,
  });
  return client;
}

export type { Stripe };
