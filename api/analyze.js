export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt required' });

  const API_KEYS = [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter(Boolean);

  if (API_KEYS.length === 0) return res.status(500).json({ error: 'No API keys configured' });

  const systemPrompt = `당신은 AI 이미지 생성 편향 분석 전문가이자 사회심리학자입니다. 아래 프롬프트를 분석하고 반드시 JSON만 반환하세요. 마크다운 코드블록 없이 순수 JSON만.

프롬프트: "${prompt}"

반환 형식:
{
  "hasBias": true 또는 false,
  "biasType": "편향 유형 (외모/성별/인종/계층/문화 등 구체적으로)",
  "biasDescription": "이 프롬프트에 어떤 편향이 내포되어 있는지 2-3문장 설명",
  "psychTheory": "가장 관련성 높은 심리학 이론 이름 (사회 정체성 이론, 고정관념 위협, 암묵적 편향, 대표성 휴리스틱, 사회비교이론, 점화 효과, 후광 효과, 귀인 오류, 내집단 편애, 확증 편향 등 다양한 이론 중 가장 적합한 것 선택)",
  "psychExplanation": "해당 이론이 이 편향과 어떻게 연결되는지 2문장 설명",
  "neutralizationExplanation": "원본 프롬프트에서 어떤 표현을 왜 어떻게 바꿨는지 구체적으로 설명 (예: '잘생긴'이라는 주관적 미적 기준을 제거하고 다양한 인종·체형·나이의 사람들이 등장하도록 명시적으로 다양성을 주입)",
  "neutralPrompt": "편향을 완화한 영어 프롬프트. 핵심 규칙: (1) 'a photo of' 또는 'photorealistic portrait of'로 시작, (2) 'diverse' 'various ethnicities' 'different body types' 'multiple ages' 같은 명시적 다양성 키워드 포함, (3) 'beautiful' 'handsome' 'successful' 'dangerous' 같은 평가적 형용사 제거, (4) 50자 이상 구체적으로 작성",
  "originalEnglish": "원본 프롬프트를 영어로 변환. 'a photo of' 또는 'photorealistic portrait of'로 시작해서 사진처럼 나오게 작성 (예: '잘생긴 남자를 그려줘' → 'photorealistic portrait of a handsome man')",
  "reflectionQuestions": ["성찰 질문 1", "성찰 질문 2", "성찰 질문 3"]
}`;

  for (var i = 0; i < API_KEYS.length; i++) {
    const apiKey = API_KEYS[i];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2000,
            thinkingConfig: { thinkingBudget: 0 }
          }
        })
      });

      const data = await response.json();
      if (data.error) {
        if (data.error.code === 429 || data.error.code === 503) continue;
        return res.status(500).json({ error: data.error.message });
      }

      var fullText = '';
      var parts = data.candidates?.[0]?.content?.parts || [];
      for (var j = 0; j < parts.length; j++) {
        if (parts[j].text) fullText += parts[j].text;
      }
      if (!fullText) continue;

      var cleaned = fullText.replace(/```json/g, '').replace(/```/g, '').trim();
      var jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;

      var parsed;
      try { parsed = JSON.parse(jsonMatch[0]); } catch (e) { continue; }

      return res.status(200).json(parsed);
    } catch (e) { continue; }
  }

  return res.status(500).json({ error: '모든 API 키의 할당량이 초과됐어요. 잠시 후 다시 시도해주세요.' });
}
