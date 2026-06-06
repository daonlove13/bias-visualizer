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

**1단계: 분석 가능 여부 판단**

본 도구는 "사람을 묘사하는 프롬프트에서 작동하는 사회적 고정관념과 편향"을 분석합니다. 다음에 해당하면 분석 불가:
- 특정 인물/캐릭터/브랜드 이름 (예: 케로로, 손흥민, 코카콜라, 미키마우스, BTS)
- 명확한 사물·풍경·동물 (예: 사과, 노을, 강아지, 의자)
- 추상 개념 (예: 행복, 자유, 평화, 사랑)
- 사람과 관련 없는 모든 주제

분석 가능: 사람을 묘사하는 표현 (예: 잘생긴 남자, 성공한 사람, 간호사, 위험해 보이는 사람, 한국인, CEO 등)

**2단계: 분석**

분석 가능한 경우의 반환 형식:
{
  "analyzable": true,
  "biasType": "편향 유형 구체적으로 (외모/성별/인종/계층/직업/문화 등 — 복합이면 여러 개 슬래시로 구분)",
  "biasDescription": "이 프롬프트에 어떤 편향이 내포되어 있는지 2-3문장 설명. 명시적 편향과 암묵적 편향 모두 짚을 것",
  "psychTheory": "심리학 이론 이름과 영문 원어 (예: '대표성 휴리스틱 (Representativeness Heuristic)')",
  "psychExplanation": "이론과 편향의 연결 2문장",
  "neutralizationExplanation": "원본 프롬프트에서 어떤 표현을 왜 어떻게 바꿨는지 구체적으로",
  "residualBias": "중립화 후에도 모델이 출력할 가능성이 높은 잔존 편향 설명 2-3문장. 왜 프롬프트만으로 제거 불가능한지",
  "neutralPrompt": "편향을 완화한 영어 프롬프트. 규칙: (1) 'a photo of' 또는 'photorealistic portrait of'로 시작, (2) 'diverse' 'various ethnicities' 'different body types' 'multiple ages' 'mixed genders' 같은 다양성 키워드 포함, (3) 평가적 형용사 제거, (4) 50자 이상",
  "originalEnglish": "원본 프롬프트를 영어로 변환. 'a photo of' 또는 'photorealistic portrait of'로 시작",
  "reflectionQuestions": ["성찰 질문 1", "성찰 질문 2", "성찰 질문 3"]
}

분석 불가능한 경우의 반환 형식:
{
  "analyzable": false,
  "reason": "이 도구는 사람을 묘사하는 프롬프트의 사회적 편향을 분석합니다. 입력하신 프롬프트는 [특정 캐릭터/사물/추상 개념 등]에 해당하여 편향 분석 대상이 아닙니다.",
  "suggestion": "다음과 같은 프롬프트를 시도해보세요: '잘생긴 남자를 그려줘', '성공한 사람을 그려줘', '간호사를 그려줘'"
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
            maxOutputTokens: 2500,
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
