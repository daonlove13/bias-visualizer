import { useState } from "react";

const examples = [
  "잘생긴 남자를 그려줘",
  "성공한 사람을 그려줘",
  "가난한 사람을 그려줘",
  "간호사를 그려줘",
  "위험해 보이는 사람을 그려줘",
];

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("");
  const [result, setResult] = useState(null);
  const [originalImg, setOriginalImg] = useState(null);
  const [neutralImg, setNeutralImg] = useState(null);
  const [imgLoading, setImgLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAnalyze() {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setResult(null);
    setOriginalImg(null);
    setNeutralImg(null);
    setError("");

    try {
      setStep("편향 분석 중...");
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const analysis = await res.json();
      if (!analysis || analysis.error) throw new Error("분석 실패");
      setResult(analysis);
      setLoading(false);
      setStep("");

      if (analysis.analyzable !== false && analysis.originalEnglish) {
        setImgLoading(true);
        try {
          const [origRes, neuRes] = await Promise.all([
            fetch("/api/image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prompt: analysis.originalEnglish }),
            }),
            fetch("/api/image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prompt: analysis.neutralPrompt }),
            }),
          ]);
          if (origRes.ok) setOriginalImg(URL.createObjectURL(await origRes.blob()));
          if (neuRes.ok) setNeutralImg(URL.createObjectURL(await neuRes.blob()));
        } catch {}
        setImgLoading(false);
      }
    } catch {
      setError("분석 중 오류가 발생했습니다. 다시 시도해주세요.");
      setLoading(false);
      setStep("");
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f0f0f",
      color: "#f0ede6",
      fontFamily: "'Georgia', 'Times New Roman', serif",
    }}>
      <div style={{ borderBottom: "1px solid #2a2a2a", padding: "2rem 3rem", display: "flex", alignItems: "baseline", gap: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "400", letterSpacing: "0.08em", margin: 0, color: "#ffffff" }}>
          편향 렌즈
        </h1>
        <span style={{ fontSize: "0.85rem", color: "#aaa", letterSpacing: "0.05em" }}>
          AI 이미지 생성 편향 가시화 도구
        </span>
      </div>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "3rem 2rem" }}>

        <p style={{ fontSize: "1.05rem", lineHeight: "1.9", color: "#d0cdc4", maxWidth: "620px", marginBottom: "3rem" }}>
          AI는 편향을 만들지 않는다. 다만 인간 사회에 이미 존재하는 편견을 데이터로 흡수해,
          객관적 사실처럼 출력할 뿐이다. 프롬프트를 입력하면 그 안에 숨은 가정을 보여준다.
        </p>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ fontSize: "0.8rem", color: "#999", letterSpacing: "0.1em", display: "block", marginBottom: "0.5rem" }}>
            프롬프트
          </label>
          <div style={{ display: "flex" }}>
            <input
              type="text"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAnalyze()}
              placeholder="예: 잘생긴 남자를 그려줘"
              style={{
                flex: 1, background: "#1a1a1a", border: "1px solid #3a3a3a", borderRight: "none",
                borderRadius: "2px 0 0 2px", padding: "0.9rem 1.2rem", color: "#f0ede6",
                fontSize: "1rem", fontFamily: "'Georgia', serif", outline: "none",
              }}
            />
            <button
              onClick={handleAnalyze}
              disabled={loading || !prompt.trim()}
              style={{
                background: loading ? "#1a1a1a" : "#f0ede6", color: loading ? "#666" : "#0f0f0f",
                border: "1px solid #3a3a3a", borderRadius: "0 2px 2px 0", padding: "0.9rem 1.8rem",
                fontSize: "0.85rem", letterSpacing: "0.08em", cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "'Georgia', serif", whiteSpace: "nowrap",
              }}
            >
              {loading ? step : "분석하기"}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "3rem" }}>
          {examples.map(ex => (
            <button key={ex} onClick={() => setPrompt(ex)} style={{
              background: "transparent", border: "1px solid #3a3a3a", borderRadius: "2px",
              padding: "0.35rem 0.8rem", color: "#aaa", fontSize: "0.8rem",
              cursor: "pointer", fontFamily: "'Georgia', serif",
            }}>
              {ex}
            </button>
          ))}
        </div>

        {error && <div style={{ color: "#e74c3c", marginBottom: "2rem" }}>{error}</div>}

        {/* 분석 불가 */}
        {result && result.analyzable === false && (
          <div style={{ borderTop: "1px solid #2a2a2a", paddingTop: "3rem" }}>
            <div style={{
              background: "#1a1a1a", border: "1px solid #3a3a3a", borderRadius: "2px",
              padding: "2rem",
            }}>
              <p style={{ fontSize: "1rem", lineHeight: "1.8", color: "#e0ddd4", marginBottom: "1.5rem" }}>
                {result.reason}
              </p>
              {result.suggestion && (
                <div style={{ borderTop: "1px solid #2a2a2a", paddingTop: "1rem" }}>
                  <p style={{ fontSize: "0.92rem", color: "#bbb", lineHeight: "1.7", margin: 0 }}>
                    {result.suggestion}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 분석 결과 */}
        {result && result.analyzable !== false && (
          <div style={{ borderTop: "1px solid #2a2a2a", paddingTop: "3rem" }}>

            {/* 편향 유형 + 설명 */}
            <div style={{ marginBottom: "2.5rem" }}>
              <div style={{
                display: "inline-block",
                background: "#1a1414", border: "1px solid #4a2a2a",
                borderRadius: "2px", padding: "0.4rem 1rem", fontSize: "0.78rem",
                letterSpacing: "0.12em", color: "#ff8a7a", marginBottom: "1rem",
              }}>
                {result.biasType}
              </div>
              <p style={{ fontSize: "1rem", lineHeight: "1.8", color: "#e0ddd4" }}>
                {result.biasDescription}
              </p>
            </div>

            {/* 심리학 이론 */}
            <div style={{ borderLeft: "2px solid #555", paddingLeft: "1.5rem", marginBottom: "3rem" }}>
              <div style={{ fontSize: "0.82rem", color: "#bbb", letterSpacing: "0.1em", marginBottom: "0.5rem", fontWeight: 500 }}>
                {result.psychTheory}
              </div>
              <p style={{ fontSize: "0.95rem", lineHeight: "1.8", color: "#ccc" }}>
                {result.psychExplanation}
              </p>
            </div>

            {/* 이미지 비교 */}
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "0.8rem", color: "#aaa", letterSpacing: "0.1em", marginBottom: "1.5rem" }}>
                이미지 비교
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                {["original", "neutral"].map(type => (
                  <div key={type}>
                    <div style={{ fontSize: "0.85rem", color: "#bbb", marginBottom: "0.7rem" }}>
                      {type === "original" ? "원본 프롬프트" : "중립화된 프롬프트"}
                    </div>
                    <div style={{
                      background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "2px",
                      aspectRatio: "1", display: "flex", alignItems: "center",
                      justifyContent: "center", overflow: "hidden",
                    }}>
                      {(type === "original" ? originalImg : neutralImg) ? (
                        <img
                          src={type === "original" ? originalImg : neutralImg}
                          alt={type}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <div style={{ textAlign: "center", padding: "2rem" }}>
                          {imgLoading ? (
                            <div style={{ fontSize: "0.85rem", color: "#aaa" }}>이미지 생성 중...</div>
                          ) : (
                            <>
                              <div style={{ fontSize: "0.8rem", color: "#888", fontFamily: "monospace", lineHeight: "1.8" }}>
                                {type === "original" ? result.originalEnglish : result.neutralPrompt}
                              </div>
                              <div style={{ fontSize: "0.7rem", color: "#666", marginTop: "0.8rem" }}>
                                이미지 생성 실패
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 중립화 방식 */}
            {result.neutralizationExplanation && (
              <div style={{
                background: "#141414", border: "1px solid #2a2a2a", borderRadius: "2px",
                padding: "1.2rem 1.5rem", marginBottom: "1rem",
              }}>
                <div style={{ fontSize: "0.78rem", color: "#aaa", letterSpacing: "0.1em", marginBottom: "0.6rem", fontWeight: 500 }}>
                  중립화 방식
                </div>
                <p style={{ fontSize: "0.92rem", lineHeight: "1.7", color: "#d8d5cc", margin: 0 }}>
                  {result.neutralizationExplanation}
                </p>
              </div>
            )}

            {/* 잔존 편향 */}
            {result.residualBias && (
              <div style={{
                background: "#1a1010", border: "1px solid #4a2020", borderRadius: "2px",
                padding: "1.2rem 1.5rem", marginBottom: "1.5rem",
              }}>
                <div style={{ fontSize: "0.78rem", color: "#ff8a7a", letterSpacing: "0.1em", marginBottom: "0.6rem", fontWeight: 500 }}>
                  중립화해도 남는 편향
                </div>
                <p style={{ fontSize: "0.92rem", lineHeight: "1.7", color: "#e0ddd4", margin: 0 }}>
                  {result.residualBias}
                </p>
              </div>
            )}

            <p style={{ fontSize: "0.88rem", color: "#999", marginBottom: "3rem", lineHeight: "1.7" }}>
              * 중립화된 버전도 완전히 편향에서 자유롭지 않다. 이 비교는 어느 쪽이 정답인지를 보여주는 것이 아니라,
              원본 프롬프트에 어떤 가정이 담겨 있었는지를 드러내는 것이다.
            </p>

            {/* 성찰 질문 */}
            <div style={{ background: "#141414", border: "1px solid #2a2a2a", borderRadius: "2px", padding: "2rem" }}>
              <div style={{ fontSize: "0.8rem", color: "#aaa", letterSpacing: "0.1em", marginBottom: "1.5rem", fontWeight: 500 }}>
                스스로 생각해보기
              </div>
              {result.reflectionQuestions?.map((q, i) => (
                <div key={i} style={{ display: "flex", gap: "1rem", marginBottom: i < result.reflectionQuestions.length - 1 ? "1.2rem" : 0 }}>
                  <span style={{ color: "#888", fontSize: "0.9rem", flexShrink: 0 }}>{i + 1}.</span>
                  <p style={{ fontSize: "0.95rem", lineHeight: "1.7", color: "#d8d5cc", margin: 0 }}>{q}</p>
                </div>
              ))}
            </div>

          </div>
        )}

        <div style={{ marginTop: "6rem", paddingTop: "2rem", borderTop: "1px solid #1a1a1a", fontSize: "0.85rem", color: "#888", lineHeight: "1.8" }}>
          AI의 편향은 기술의 결함이 아니라 인간 사회의 편견이 데이터로 굳어진 결과이며,
          그것이 다시 사람들의 인식을 강화하는 순환 구조 속에 우리가 놓여 있다.
        </div>
      </div>
    </div>
  );
}
