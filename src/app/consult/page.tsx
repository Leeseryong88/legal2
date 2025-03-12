"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { encryptData, decryptData } from "@/lib/utils";

export default function ConsultPage() {
  const router = useRouter();
  const [legalIssue, setLegalIssue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (!legalIssue.trim()) {
      setError("법률 문제를 입력해주세요.");
      return;
    }
    
    if (legalIssue.trim().length < 5) {
      setError("법률 문제를 더 자세히 설명해주세요 (최소 5자 이상).");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // 세션 스토리지에 법률 문제 저장
      // 기존 analysisAnswers가 있으면 가져와서 업데이트
      let analysisData: Record<string, string> = { mainIssue: legalIssue };
      const existingData = sessionStorage.getItem("analysisAnswers");
      
      if (existingData) {
        try {
          // 암호화된 데이터가 있을 경우 복호화 후 사용
          const isEncrypted = existingData.startsWith("eyJ") || existingData.indexOf("{") === -1;
          
          if (isEncrypted) {
            // decryptData 함수를 사용하여 데이터 복호화
            const parsed = decryptData(existingData);
            if (parsed) {
              // 기존 데이터를 유지하면서 mainIssue만 업데이트
              analysisData = { ...parsed, mainIssue: legalIssue };
            }
          } else {
            // 기존 방식으로 저장된 데이터 처리
            const parsed = JSON.parse(existingData);
            // 기존 데이터를 유지하면서 mainIssue만 업데이트
            analysisData = { ...parsed, mainIssue: legalIssue };
          }
        } catch (e) {
          console.error("기존 analysisAnswers 파싱 오류:", e);
        }
      }
      
      // 암호화하여 저장
      const encryptedData = encryptData(analysisData);
      const encryptedIssue = encryptData(legalIssue);
      
      // 두 가지 방식으로 저장 (하위 호환성 유지)
      sessionStorage.setItem("legalIssue", encryptedIssue);
      sessionStorage.setItem("analysisAnswers", encryptedData);
      
      // 저장 잘 되었는지 로그로 확인
      console.log("저장된 법률 문제:", legalIssue);
      console.log("저장된 분석 데이터:", analysisData);
      
      // 분석 페이지로 이동
      router.push("/analyze");
    } catch (err) {
      console.error("데이터 저장 중 오류:", err);
      setError("데이터를 저장하는 중 오류가 발생했습니다. 다시 시도해주세요.");
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="max-w-3xl w-full mt-8">
        <Link href="/">
          <Button variant="ghost" className="mb-6">← 홈으로 돌아가기</Button>
        </Link>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">법률 문제 상담</CardTitle>
            <CardDescription>
              법률 문제에 대해 상세히 설명해주세요. 더 자세한 정보를 제공할수록 정확한 법률 자문을 받을 수 있습니다.
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label htmlFor="legal-issue" className="block font-medium mb-2">
                    법률 문제 설명
                  </label>
                  <Textarea 
                    id="legal-issue"
                    placeholder="법률 문제에 대해 최대한 자세히 설명해주세요. 예: 임대차 계약 관련 문제, 임금 체불 문제 등"
                    rows={8}
                    value={legalIssue}
                    onChange={(e) => setLegalIssue(e.target.value)}
                    className="resize-none"
                  />
                  
                  {error && (
                    <p className="text-red-500 mt-2 text-sm">{error}</p>
                  )}
                  
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                    <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">작성 도움말</h3>
                    <ul className="list-disc list-inside text-sm text-slate-700 dark:text-slate-300 space-y-1">
                      <li>언제, 어디서, 어떤 상황에서 문제가 발생했는지 설명해주세요.</li>
                      <li>관련된 계약이나 합의 사항이 있었다면 그 내용도 포함해주세요.</li>
                      <li>이미 취한 조치가 있다면 그것도 알려주세요.</li>
                      <li>원하는 해결 방향이나 결과가 있다면 함께 작성해주세요.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="flex justify-end">
              <Button 
                type="submit" 
                disabled={isSubmitting || !legalIssue.trim()}
                className="flex items-center"
              >
                {isSubmitting ? "처리 중..." : "다음 단계로"}
                {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </main>
  );
} 