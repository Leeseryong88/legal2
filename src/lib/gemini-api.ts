/**
 * Google Gemini API를 사용하여 법률 조언을 생성하는 유틸리티 함수
 */

// Gemini API 응답 인터페이스
interface GeminiResponse {
  category: string;
  summary: string;
  legalAnalysis: {
    title: string;
    content: string;
  }[];
  recommendations: {
    title: string;
    content: string;
  }[];
  nextSteps: string;
}

// Gemini API를 사용하여 법률 조언 생성
export async function generateLegalAdviceWithGemini(
  legalIssue: string,
  answers: Record<string, string>
): Promise<GeminiResponse> {
  try {
    const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!API_KEY) {
      throw new Error("Gemini API 키가 설정되지 않았습니다.");
    }
    
    // API 키가 기본값인지 확인
    if (API_KEY === "your_api_key_here" || API_KEY.length < 10) {
      throw new Error("유효한 Gemini API 키를 설정해주세요.");
    }
    
    // 모델 이름 수정 (gemini-1.5-flash로 변경)
    const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

    // 사용자 답변에서 관련 정보 추출
    const incidentDate = answers.incidentDate || "명시되지 않음";
    const amount = answers.amount || "명시되지 않음";
    const attempts = answers.attempts || "명시되지 않음";
    const desiredOutcome = answers.desiredOutcome || "명시되지 않음";
    const additionalInfo = answers.additionalInfo || "추가 정보 없음";

    // API에 전송할 프롬프트 구성
    const prompt = `
    당신은 전문 법률 조언 시스템입니다. 아래 사용자가 제공한 법률 문제와 관련 정보를 분석하고, 
    법률적 조언과 해결책을 제시해주세요.

    ### 사용자 제공 정보:
    - 주요 법률 문제: ${legalIssue}
    - 사건 발생일: ${incidentDate}
    - 관련 금액: ${amount}
    - 해결 시도: ${attempts}
    - 희망 결과: ${desiredOutcome}
    - 추가 정보: ${additionalInfo}

    ### 중요 지시사항:
    반드시 다음 JSON 형식으로만 응답해주세요. 다른 어떤 형식의 응답이나 설명도 포함하지 마세요.
    어떤 경우에도 응답은 항상 아래 형식의 유효한 JSON 객체여야 합니다.
    
    ### 요청사항:
    1. 해당 사례가 어떤 법률 카테고리에 해당하는지 판단해주세요 (예: 계약 관련 분쟁, 부동산/임대차, 노동/근로 관계, 상속/유언 등).
    2. 사용자가 제공한 정보를 요약해주세요.
    3. 관련 법률 조항과 판례를 분석해주세요.
    4. 법적 대응 방안, 필요 서류 및 증거, 전문가 상담 필요성에 대한 구체적인 조언을 제공해주세요.
    5. 다음 단계에 대한 추천 사항을 제시해주세요.

    ### 응답 형식:
    {
      "category": "법률 카테고리",
      "summary": "사례 요약",
      "legalAnalysis": [
        {
          "title": "관련 법률 조항",
          "content": "법률 조항 설명"
        },
        {
          "title": "관련 판례 및 사례",
          "content": "판례 및 사례 설명"
        }
      ],
      "recommendations": [
        {
          "title": "법적 대응 방안",
          "content": "대응 방안 설명"
        },
        {
          "title": "필요 서류 및 증거",
          "content": "필요 서류 설명"
        },
        {
          "title": "전문가 상담 필요성",
          "content": "전문가 상담 필요성 설명"
        }
      ],
      "nextSteps": "권장 다음 단계"
    }
    `;

    // API 요청 옵션
    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": API_KEY.trim(),
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4096,
        },
      }),
    };

    // API 호출
    console.log("API 요청 전송 중...");
    const response = await fetch(API_URL, requestOptions);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API 요청 실패 상세 정보: ${response.status} ${response.statusText}`);
      console.error(`에러 응답 본문: ${errorText}`);
      throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // API 응답에서 텍스트 추출
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // 응답 텍스트 로깅 (디버깅 용)
    console.log("API 응답 텍스트:", responseText);
    
    // JSON 형식으로 파싱
    try {
      // JSON 문자열 추출 시도 (여러 패턴에 대해)
      let jsonStr = "";
      
      // 1. 마크다운 코드 블록에서 JSON 추출 시도
      const jsonBlockMatch = responseText.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
      if (jsonBlockMatch && jsonBlockMatch[1]) {
        jsonStr = jsonBlockMatch[1].trim();
      } 
      // 2. 중괄호를 사용한 JSON 패턴 추출 시도
      else {
        const jsonMatch = responseText.match(/({[\s\S]*})/);
        if (jsonMatch) {
          jsonStr = jsonMatch[0].trim();
        } 
        // 3. 직접 텍스트 사용 (JSON이 아닌 경우)
        else {
          jsonStr = responseText.trim();
        }
      }
      
      // jsonStr이 JSON 형식이 아닌 경우 체크
      const isJsonFormat = jsonStr.startsWith('{') && jsonStr.endsWith('}');
      
      if (!isJsonFormat) {
        // API가 JSON이 아닌 일반 텍스트로 응답한 경우
        console.log("JSON이 아닌 텍스트 응답:", jsonStr);
        
        // 텍스트 응답을 기반으로 JSON 형식 구조 생성
        return createStructuredResponseFromText(jsonStr, legalIssue);
      }
      
      // 유효한 JSON 형식일 경우 파싱 시도
      const parsedResponse = JSON.parse(jsonStr);
      
      // 필요한 필드가 있는지 확인하고 반환
      return {
        category: parsedResponse.category || "법률 자문",
        summary: parsedResponse.summary || "요약 정보가 제공되지 않았습니다.",
        legalAnalysis: parsedResponse.legalAnalysis || [{ title: "법률 분석", content: "법률 분석 정보가 제공되지 않았습니다." }],
        recommendations: parsedResponse.recommendations || [{ title: "대응 방안", content: "대응 방안 정보가 제공되지 않았습니다." }],
        nextSteps: parsedResponse.nextSteps || "다음 단계 정보가 제공되지 않았습니다.",
      };
    } catch (error) {
      console.error("API 응답 파싱 오류:", error, "원본 응답:", responseText);
      
      // 파싱 실패 시 텍스트 응답을 기반으로 구조화된 응답 생성
      return createStructuredResponseFromText(responseText, legalIssue);
    }
  } catch (error) {
    console.error("Gemini API 호출 오류:", error);
    throw new Error("법률 자문을 생성하는 중 오류가 발생했습니다.");
  }
}

// 텍스트 응답에서 구조화된 응답 생성
function createStructuredResponseFromText(text: string, legalIssue: string): GeminiResponse {
  // 텍스트에서 카테고리 추정
  let category = "법률 자문";
  if (text.includes("계약") || text.includes("분쟁")) {
    category = "계약 관련 분쟁";
  } else if (text.includes("부동산") || text.includes("임대") || text.includes("전세")) {
    category = "부동산/임대차";
  } else if (text.includes("노동") || text.includes("근로") || text.includes("임금")) {
    category = "노동/근로 관계";
  } else if (text.includes("상속") || text.includes("유언")) {
    category = "상속/유언";
  }
  
  // 텍스트 길이에 따라 처리 방법 결정
  const isErrorMessage = text.includes("죄송합니다") || text.includes("오류") || text.length < 100;
  
  if (isErrorMessage) {
    // 오류 메시지인 경우 간단한 응답 구조 생성
    return {
      category: "법률 자문",
      summary: `입력하신 법률 문제(${legalIssue})에 대한 분석을 제공할 수 없습니다.`,
      legalAnalysis: [
        {
          title: "처리 오류",
          content: "현재 시스템이 법률 분석을 생성하는 데 어려움이 있습니다. 다시 시도해주세요."
        }
      ],
      recommendations: [
        {
          title: "권장 사항",
          content: "질문을 더 구체적으로 작성하거나, 법률 문제의 핵심 사항만 간략하게 설명해 보세요."
        }
      ],
      nextSteps: "문제가 지속되면 직접 법률 전문가에게 상담하시는 것을 권장합니다."
    };
  }
  
  // 텍스트를 여러 부분으로 나누기 (대략적인 분할)
  const paragraphs = text.split(/\n\n|\r\n\r\n/).filter(p => p.trim().length > 0);
  
  // 텍스트의 첫 부분을 요약으로 사용
  const summary = paragraphs[0] || `귀하의 법률 문제(${legalIssue})에 대한 분석입니다.`;
  
  // 나머지 텍스트를 분석과 권장사항으로 할당
  const analysisText = paragraphs.length > 1 ? paragraphs[1] : "";
  const recommendationsText = paragraphs.length > 2 ? paragraphs[2] : "";
  const nextStepsText = paragraphs.length > 3 ? paragraphs[3] : "";
  
  return {
    category,
    summary,
    legalAnalysis: [
      {
        title: "법률 분석",
        content: analysisText || "상세한 법률 분석을 제공할 수 없습니다."
      }
    ],
    recommendations: [
      {
        title: "권장 대응 방안",
        content: recommendationsText || "현재 시스템은 귀하의 상황에 대한 구체적인 대응 방안을 제시할 수 없습니다."
      }
    ],
    nextSteps: nextStepsText || "추가적인 법률 자문을 위해 변호사와 상담하는 것을 권장합니다."
  };
}

// AI변호사 조언 생성 함수
export async function generateLawyerAdvice(
  legalIssue: string,
  analysisResults: GeminiResponse
): Promise<string> {
  try {
    const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!API_KEY) {
      throw new Error("Gemini API 키가 설정되지 않았습니다.");
    }
    
    // API 키가 기본값인지 확인
    if (API_KEY === "your_api_key_here" || API_KEY.length < 10) {
      throw new Error("유효한 Gemini API 키를 설정해주세요.");
    }
    
    // 모델 이름 수정
    const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

    // 프롬프트 수정 - 도입부 제거 및 특수문자(**) 사용 방지
    const prompt = `
    당신은 법률 전문가 AI입니다. 아래 법률 문제와 이미 수행된 법률 분석을 검토한 후, 
    더 전문적인 법률 조언을 제공해주세요.
    
    ### 의뢰인의 법률 문제:
    ${legalIssue}
    
    ### 이미 제공된 법률 분석 결과:
    - 법률 카테고리: ${analysisResults.category}
    - 사례 요약: ${analysisResults.summary}
    
    - 법률 조항 분석: ${analysisResults.legalAnalysis.map(item => 
      `${item.title}: ${item.content}`).join('\n')}
    
    - 권장 대응 방안: ${analysisResults.recommendations.map(item => 
      `${item.title}: ${item.content}`).join('\n')}
    
    - 권장 다음 단계: ${analysisResults.nextSteps}
    
    ### 요청사항:
    위 정보를 검토하시고, 다음 내용을 포함하는 전문적인 법률 조언을 제공해주세요:
    
    1. 이 사례의 성공 가능성과 위험 요소
    2. 법원이나 상대방이 어떻게 반응할지에 대한 현실적 예측
    3. 전략적 접근법 (협상, 소송, 대안적 분쟁 해결 등)
    4. 의뢰인이 놓치고 있을 수 있는 중요한 법적 고려사항
    5. 최적의 결과를 얻기 위한 구체적인 행동 계획
    
    중요한 지침:
    - 어떤 형태의 도입부나 인사말도 포함하지 마세요. 바로 조언 내용으로 시작하세요.
    - 별표(**)나 기타 특수 포맷팅 문자를 사용하지 마세요.
    - 각 주제별로 소제목을 사용하되, 번호 매김이나 글머리 기호를 사용하세요.
    - 실용적이고 이해하기 쉬운 언어로 설명해주세요.
    - 각 섹션은 명확히 구분되어야 하지만 특수 문자 없이 자연스럽게 표현하세요.
    `;

    // API 요청 옵션
    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": API_KEY.trim(),
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4096,
        },
      }),
    };

    // API 호출
    console.log("법률 조언 API 요청 전송 중...");
    const response = await fetch(API_URL, requestOptions);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API 요청 실패 상세 정보: ${response.status} ${response.statusText}`);
      console.error(`에러 응답 본문: ${errorText}`);
      throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // API 응답에서 텍스트 추출
    const lawyerAdvice = data.candidates?.[0]?.content?.parts?.[0]?.text || 
      "전문 변호사 조언을 생성하는 중 오류가 발생했습니다.";
    
    return lawyerAdvice;
  } catch (error) {
    console.error("변호사 조언 생성 중 오류 발생:", error);
    return "변호사 조언을 생성하는 중 오류가 발생했습니다. 다시 시도해주세요.";
  }
} 