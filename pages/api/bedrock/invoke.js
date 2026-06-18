import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({ region: process.env.BEDROCK_REGION });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const { prompt } = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  if (!prompt) return res.status(400).json({ error: "Missing prompt" });

  const model = process.env.BEDROCK_MODEL_ID;

  try {
    const body = JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const command = new InvokeModelCommand({
      modelId: model,
      contentType: "application/json",
      accept: "application/json",
      body,
    });

    const response = await client.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.body));
    res.json({ output: result.content?.[0]?.text ?? "", model, usage: result.usage });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
