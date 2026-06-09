import { DsqlSigner } from "@aws-sdk/dsql-signer";
import postgres from "postgres";

function getRegionFromHost(host) {
  const match = host?.match(/\.dsql\.(.+?)\.on\.aws/);
  return match ? match[1] : "us-east-1";
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const host = process.env.PGHOST;
  const region = getRegionFromHost(host);

  let connection;
  try {
    const signer = new DsqlSigner({ hostname: host, region });
    const token = await signer.getDbConnectAdminAuthToken();

    connection = postgres({
      host,
      port: parseInt(process.env.PGPORT || "5432"),
      username: process.env.PGUSER || "admin",
      password: token,
      database: process.env.PGDATABASE || "postgres",
      ssl: true,
    });

    await connection`
      CREATE TABLE IF NOT EXISTS todos (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        title TEXT NOT NULL,
        completed BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `;

    await connection`
      INSERT INTO todos (title) VALUES
        ('Try the DSQL binding demo'),
        ('Upload a file to S3'),
        ('Chat with Bedrock')
      ON CONFLICT DO NOTHING
    `;

    const rows = await connection`SELECT * FROM todos ORDER BY created_at`;
    res.json({ ok: true, message: "Table 'todos' created with sample data", rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    if (connection) await connection.end().catch(() => {});
  }
}
