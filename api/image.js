export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "prompt required" });

  const hfToken = process.env.HF_TOKEN;
  if (!hfToken) return res.status(400).json({ error: "HF_TOKEN not set" });

  try {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${hfToken}`,
        },
        body: JSON.stringify({ inputs: prompt }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: err });
    }

    const buffer = await response.arrayBuffer();
    res.setHeader("Content-Type", "image/jpeg");
    res.status(200).send(Buffer.from(buffer));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
