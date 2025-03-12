"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { encryptData, decryptData } from "@/lib/utils";

interface Question {
  id: string;
  text: string;
  required: boolean;
  type: "text" | "textarea" | "date";
}

export default function AnalyzePage() {
  const router = useRouter();
  const [legalIssue, setLegalIssue] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedQuestions, setSelectedQuestions] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 질문 목록 정의
  const questions: Question[] = [
    {
      id: "incidentDate",
      text: "사건이 발생한 날짜는 언제인가요?",
      required: true,
      type: "date"
    },
    {
      id: "amount",
      text: "관련된 금액이 있다면 얼마인가요? (예: 계약금, 손해액 등)",
      required: false,
      type: "text"
    },
    {
      id: "attempts",
      text: "현재까지 어떤 해결 시도를 하셨나요?",
      required: false,
      type: "textarea"
    },
    {
      id: "desiredOutcome",
      text: "원하시는 해결 방향이나 결과는 무엇인가요?",
      required: false,
      type: "textarea"
    },
    {
      id: "additionalInfo",
      text: "추가로 알려주실 정보가 있으신가요?",
      required: false,
      type: "textarea"
    }
  ];

  useEffect(() => {
    // 세션 스토리지에서 법률 문제 데이터 불러오기
    const loadStoredData = () => {
      // 기존 데이터 확인 (두 가지 방식 모두 확인)
      const storedLegalIssue = sessionStorage.getItem("legalIssue");
      const storedAnalysisAnswers = sessionStorage.getItem("analysisAnswers");
      
      console.log("불러온 법률 문제:", storedLegalIssue);
      console.log("불러온 분석 데이터:", storedAnalysisAnswers);
      
      // 기본 응답 객체 초기화
      let initialAnswers: Record<string, string> = {};
      let mainIssue = "";
      
      // 1. analysisAnswers에서 데이터 불러오기
      if (storedAnalysisAnswers) {
        try {
          // 암호화된 데이터인지 확인
          const isEncrypted = storedAnalysisAnswers.startsWith("eyJ") || storedAnalysisAnswers.indexOf("{") === -1;
          
          let parsedAnswers;
          if (isEncrypted) {
            // 암호화된 데이터 복호화
            parsedAnswers = decryptData(storedAnalysisAnswers);
          } else {
            // 이전 방식으로 저장된 데이터 처리
            parsedAnswers = JSON.parse(storedAnalysisAnswers);
          }
          
          if (parsedAnswers) {
            initialAnswers = parsedAnswers;
            
            if (parsedAnswers.mainIssue) {
              mainIssue = parsedAnswers.mainIssue;
            }
          }
        } catch (e) {
          console.error("분석 데이터 파싱 오류:", e);
        }
      }
      
      // 2. mainIssue가 없고, legalIssue에서 데이터 불러오기
      if (!mainIssue && storedLegalIssue) {
        try {
          // 암호화된 데이터인지 확인
          const isEncrypted = storedLegalIssue.startsWith("eyJ") || storedLegalIssue.indexOf("{") === -1;
          
          let parsedIssue;
          if (isEncrypted) {
            // 암호화된 데이터 복호화
            parsedIssue = decryptData(storedLegalIssue);
          } else {
            // 이전 방식으로 저장된 데이터 처리
            parsedIssue = JSON.parse(storedLegalIssue);
          }
          
          if (typeof parsedIssue === "string") {
            mainIssue = parsedIssue;
            // 응답에 mainIssue 추가
            initialAnswers.mainIssue = mainIssue;
          }
        } catch (e) {
          console.error("법률 문제 데이터 파싱 오류:", e);
        }
      }
      
      // 데이터가 없으면 상담 페이지로 리다이렉트
      if (!mainIssue) {
        setError("법률 문제 정보를 찾을 수 없습니다. 상담을 다시 시작해주세요.");
        setTimeout(() => {
          router.push("/consult");
        }, 2000);
        return;
      }
      
      // 상태 업데이트
      setLegalIssue(mainIssue);
      setAnswers(initialAnswers);
      
      // 선택된 질문 상태 초기화
      const initialSelectedQuestions: Record<string, boolean> = {};
      questions.forEach(q => {
        // 필수 질문이거나 이미 답변이 있는 질문은 체크
        initialSelectedQuestions[q.id] = q.required || !!initialAnswers[q.id];
      });
      setSelectedQuestions(initialSelectedQuestions);
    };
    
    loadStoredData();
  }, [router, questions]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      // 법률 문제가 없으면 오류 표시
      if (!legalIssue.trim()) {
        setError("법률 문제 설명이 필요합니다. 상담 페이지로 돌아가 입력해주세요.");
        setIsSubmitting(false);
        return;
      }
      
      // 선택한 필수 질문의 답변이 있는지 확인
      let missingRequiredAnswer = false;
      questions.forEach(q => {
        if (q.required && selectedQuestions[q.id] && !answers[q.id]) {
          missingRequiredAnswer = true;
        }
      });
      
      if (missingRequiredAnswer) {
        setError("필수 질문에 모두 답변해주세요.");
        setIsSubmitting(false);
        return;
      }
      
      // mainIssue 포함하여 최종 답변 데이터 구성
      const finalAnswers = {
        ...answers,
        mainIssue: legalIssue
      };
      
      // 데이터 암호화 및 세션 스토리지에 저장
      const encryptedData = encryptData(finalAnswers);
      sessionStorage.setItem("analysisAnswers", encryptedData);
      console.log("저장된 최종 분석 데이터:", finalAnswers);
      
      // 결과 페이지로 이동
      router.push("/result");
    } catch (err) {
      console.error("데이터 저장 중 오류:", err);
      setError("데이터를 저장하는 중 오류가 발생했습니다. 다시 시도해주세요.");
      setIsSubmitting(false);
    }
  };

  const handleQuestionToggle = (questionId: string, checked: boolean) => {
    setSelectedQuestions(prev => ({
      ...prev,
      [questionId]: checked
    }));
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="max-w-md text-center">
          <h2 className="text-2xl font-bold mb-4 text-red-500">오류 발생</h2>
          <p className="text-slate-700 dark:text-slate-300 mb-6">{error}</p>
          <Button onClick={() => router.push("/consult")}>
            상담 페이지로 돌아가기
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="max-w-3xl w-full mt-8">
        <Link href="/consult">
          <Button variant="ghost" className="mb-6">← 상담 페이지로 돌아가기</Button>
        </Link>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">추가 정보 입력</CardTitle>
            <CardDescription>
              더 정확한 법률 분석을 위해 추가 정보를 입력해주세요. 필수 항목만 작성하거나 원하는 질문만 선택하여 답변할 수 있습니다.
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent>
              <div className="space-y-6">
                {/* 법률 문제 요약 표시 */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                  <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">입력하신 법률 문제:</h3>
                  <p className="text-slate-700 dark:text-slate-300">
                    {legalIssue}
                  </p>
                </div>
                
                {/* 질문 목록 */}
                {questions.map((question) => (
                  <div key={question.id} className="border rounded-md p-4">
                    <div className="flex items-start space-x-2 mb-3">
                      <input
                        type="checkbox"
                        id={`select-${question.id}`}
                        checked={selectedQuestions[question.id] || false}
                        onChange={(e) => handleQuestionToggle(question.id, e.target.checked)}
                        disabled={question.required}
                        className="mt-1"
                      />
                      <div>
                        <label
                          htmlFor={`select-${question.id}`}
                          className="text-base font-medium cursor-pointer"
                        >
                          {question.text}
                          {question.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {question.required && (
                          <p className="text-xs text-slate-500">필수 항목입니다</p>
                        )}
                      </div>
                    </div>
                    
                    {selectedQuestions[question.id] && (
                      <div className="mt-2 pl-6">
                        {question.type === "textarea" ? (
                          <Textarea
                            id={question.id}
                            value={answers[question.id] || ""}
                            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                            placeholder="답변을 입력해주세요"
                            className="resize-none"
                          />
                        ) : question.type === "date" ? (
                          <Input
                            id={question.id}
                            type="date"
                            value={answers[question.id] || ""}
                            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                          />
                        ) : (
                          <Input
                            id={question.id}
                            value={answers[question.id] || ""}
                            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                            placeholder="답변을 입력해주세요"
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
            
            <CardFooter className="flex justify-end">
              <Button 
                type="submit" 
                disabled={isSubmitting}
              >
                {isSubmitting ? "분석 중..." : "법률 분석 시작하기"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </main>
  );
} 