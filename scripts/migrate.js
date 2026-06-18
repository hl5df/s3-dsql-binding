const { DsqlSigner } = require("@aws-sdk/dsql-signer");
const postgres = require("postgres");

async function migrate() {
  const host = process.env.PGHOST;
  if (!host) {
    console.log("PGHOST not set, skipping migration");
    return;
  }

  const match = host.match(/\.dsql\.(.+?)\.on\.aws/);
  const region = match ? match[1] : "us-east-1";

  const signer = new DsqlSigner({ hostname: host, region });
  const token = await signer.getDbConnectAdminAuthToken();

  const connection = postgres({
    host,
    port: parseInt(process.env.PGPORT || "5432"),
    username: process.env.DSQL_ADMIN_USER || "admin",
    password: token,
    database: process.env.PGDATABASE || "postgres",
    ssl: true,
  });

  try {
    await connection`
      CREATE TABLE IF NOT EXISTS food_orders (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        item TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        customer_name TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `;
    console.log("Migration complete: food_orders table ready");
  } finally {
    await connection.end();
  }
}

migrate().catch((e) => {
  console.error("Migration failed:", e.message);
  process.exit(1);
});
