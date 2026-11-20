import { assertLocalDatabase, TEST_DATABASE_URL } from "./test-db-url";

// Antes de importar la app: el cliente de Prisma lee DATABASE_URL al crearse.
assertLocalDatabase(TEST_DATABASE_URL);
process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
process.env.STRIPE_SECRET_KEY = "sk_test_integration";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_integration_secret";
process.env.CRON_SECRET = "integration-cron-secret-0123456789";
