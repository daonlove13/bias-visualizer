export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "prompt required" });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `당신은 AI 이미지 생성 편향 분석 전문가입니다. 아래 프롬프트를 분석하고 반드시 JSON만 반환하세요. 마크다운 코드블록 없이 순수 JSON만.

프롬프트: "${prompt}"

반환 형식:
{
  "hasBias": true/false,
  "biasType": "편향 유형 (외모/성별/인종/계층 등)",
  "biasDescription": "이 프롬프트에 어떤 편향이 내포되어 있는지 2-3문장 설명",
  "psychTheory": "관련 심리학 이론 이름",
  "psychExplanation": "해당 이론이 이 편향과 어떻게 연결되는지 2문장 설명",
  "neutralPrompt": "편향을 완화한 중립적 영어 프롬프트 (이미지 생성용)",
  "originalEnglish": "원본 프롬프트를 영어로 변환 (이미지 생성용)",
  "reflectionQuestions": ["성찰 질문 1", "성찰 질문 2", "성찰 질문 3"]
}`
        }]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || "{}";
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    res.status(200).json(parsed);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
