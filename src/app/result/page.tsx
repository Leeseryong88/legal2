"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { generateLegalAdviceWithGemini, generateLawyerAdvice } from "@/lib/gemini-api";
import { AlertCircle, X } from "lucide-react";
import React from 'react';
import { decryptData } from "@/lib/utils";

// 타입 정의 추가
interface LegalAnalysisItem {
  title: string;
  content: string;
}

interface AdviceSection {
  title: string;
  content: string[];
}

interface LawyerAdviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  advice: string;
  isLoading: boolean;
}

// 법률 텍스트 포맷팅 함수 개선
function formatLegalText(text: string): string[] {
  if (!text) return [""];
  
  // 번호 형식 패턴 (1., 1), 가., 가) 등)을 감지하여 분할
  const items = text.split(/(?:\r?\n)+/);
  const nonEmptyItems = items.filter(item => item.trim().length > 0);
  
  if (nonEmptyItems.length <= 1) {
    // 번호 형식으로 된 텍스트 분할 시도 (예: "1. 내용 2. 내용")
    const numberedPattern = /(\d+[\.\)]\s+[^\d].*?)(?=\s+\d+[\.\)]|$)/g;
    const matches = text.match(numberedPattern);
    
    if (matches && matches.length > 1) {
      return matches;
    }
  }
  
  return nonEmptyItems;
}

// 번호가 매겨진 리스트를 효과적으로 처리하는 함수
function formatNumberedList(text: string): string[] {
  if (!text) return [""];
  
  // 여러 번호 형식 패턴을 지원하는 정규식
  const numberPatterns = [
    /(\d+[\.\)]\s+[^.]*?)(?=\s+\d+[\.\)]|$)/g,  // "1. 내용" 또는 "1) 내용" 형식
    /((?:[가-힣]|[a-zA-Z])[\.\)]\s+[^.]*?)(?=\s+(?:[가-힣]|[a-zA-Z])[\.\)]|$)/g,  // "가. 내용" 또는 "A. 내용" 형식
  ];
  
  for (const pattern of numberPatterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      return matches.map(item => item.trim());
    }
  }
  
  // 줄바꿈 기준으로 나누기 시도
  const lines = text.split(/(?:\r?\n)+/).filter(line => line.trim().length > 0);
  if (lines.length > 1) {
    return lines;
  }
  
  // 구분자 없이 하나의 항목만 있는 경우
  return [text];
}

// 리스트 항목에서 번호 제거 함수
function removeListItemNumber(text: string): string {
  return text.replace(/^(?:\d+|[가-힣]|[a-zA-Z])[\.\)]\s*/, '');
}

// 권장 단계를 리스트로 분할하는 함수
function formatSteps(text: string): string[] {
  if (!text) return [""];
  
  // 여러 형식의 리스트 분할 시도
  const numberFormats = formatNumberedList(text);
  if (numberFormats.length > 1) {
    return numberFormats;
  }
  
  // 문장 단위로 분할
  const sentences = text.split(/(?<=\.\s)(?=[가-힣A-Za-z0-9])/);
  if (sentences.length > 1) {
    return sentences.filter(s => s.trim().length > 0);
  }
  
  return [text];
}

// 텍스트 분할 디버깅 함수 추가 (콘솔에 로깅)
function debugTextSplitting(text: string, title: string) {
  console.log(`[DEBUG] ${title} 텍스트:`, text);
  // 텍스트에 번호 패턴이 있는지 확인
  const hasNumberPattern = /\d+[\.\)]\s/.test(text);
  console.log(`[DEBUG] ${title} 번호 패턴 포함:`, hasNumberPattern);
}

// 강화된 번호 리스트 분할 함수
function splitNumberedList(text: string): string[] {
  if (!text || text.trim().length === 0) return [""];
  
  debugTextSplitting(text, "리스트 분할 시작");
  
  // 1. 먼저 줄바꿈으로 분할 시도
  const lines = text.split(/\r?\n+/).filter(line => line.trim().length > 0);
  
  // 2. 각 줄이 번호로 시작하는지 확인
  const allLinesNumbered = lines.length > 1 && 
    lines.every(line => /^\s*(?:\d+[\.\)]|[가-힣][\.\)]|[a-zA-Z][\.\)])\s/.test(line.trim()));
  
  if (lines.length > 1 && allLinesNumbered) {
    console.log("[DEBUG] 줄바꿈 기준 번호 리스트 감지됨:", lines);
    return lines;
  }
  
  // 3. 번호+공백 패턴으로 분할 시도 (한 줄에 여러 번호 항목이 있는 경우)
  // "1. 내용 2. 내용" 같은 패턴 처리
  const firstNumberMatch = text.match(/^\s*(?:\d+[\.\)]|[가-힣][\.\)]|[a-zA-Z][\.\)])\s+/);
  if (firstNumberMatch) {
    // 첫 번째 패턴을 제외한 텍스트
    const remainingText = text.substring(firstNumberMatch[0].length);
    
    // 남은 텍스트에서 번호 패턴 위치 찾기
    const matches = [...remainingText.matchAll(/\s+(?:\d+[\.\)]|[가-힣][\.\)]|[a-zA-Z][\.\)])\s+/g)];
    
    if (matches.length > 0) {
      const items = [];
      
      // 첫 번째 항목 추가
      items.push(firstNumberMatch[0] + remainingText.substring(0, matches[0].index));
      
      // 중간 항목들 추가
      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        const nextIndex = i < matches.length - 1 ? matches[i+1].index : remainingText.length;
        const item = remainingText.substring(match.index, nextIndex);
        items.push(item);
      }
      
      console.log("[DEBUG] 번호 패턴으로 분할된 항목들:", items);
      return items.map(item => item.trim());
    }
  }
  
  // 4. "1. 항목1 2. 항목2" 형식 처리를 위한 정규식 추가 시도
  const numberedItemsPattern = /(\d+[\.\)]\s+[^0-9\.\)]+)(?=\s+\d+[\.\)]|$)/g;
  const numberedMatches = text.match(numberedItemsPattern);
  
  if (numberedMatches && numberedMatches.length > 0) {
    console.log("[DEBUG] 대체 패턴으로 분할된 항목들:", numberedMatches);
    return numberedMatches.map(item => item.trim());
  }
  
  // 5. 영어/한글 번호 형식 처리
  const alphaItemsPattern = /([a-zA-Z가-힣][\.\)]\s+[^a-zA-Z가-힣\.\)]+)(?=\s+[a-zA-Z가-힣][\.\)]|$)/g;
  const alphaMatches = text.match(alphaItemsPattern);
  
  if (alphaMatches && alphaMatches.length > 0) {
    console.log("[DEBUG] 문자 번호 패턴으로 분할된 항목들:", alphaMatches);
    return alphaMatches.map(item => item.trim());
  }
  // 6. 강제로 번호 앞에서 분할
  const numberMatches = text.match(/\d+[\.\)]/g);
  if (numberMatches && numberMatches.length > 1) {
    const forceSplit = text.split(/(?=\s*\d+[\.\)])/).filter(s => s.trim().length > 0);
    if (forceSplit.length > 1) {
      console.log("[DEBUG] 강제로 번호 앞에서 분할된 항목들:", forceSplit);
      return forceSplit.map(item => item.trim());
    }
  }
  
  // 7. 구두점으로 문장 분리 시도
  const sentences = text.split(/(?<=\.\s)(?=[^0-9])/).filter(s => s.trim().length > 0);
  if (sentences.length > 1) {
    console.log("[DEBUG] 문장 단위로 분할:", sentences);
    return sentences.map(s => s.trim());
  }
  
  // 8. 어떤 방법으로도 분할되지 않으면 텍스트 길이에 따라 임의로 분할
  if (text.length > 100) {
    const words = text.split(/\s+/);
    const chunks = [];
    let currentChunk = [];
    
    for (const word of words) {
      currentChunk.push(word);
      // 약 50단어 단위로 분할
      if (currentChunk.length >= 15) {
        chunks.push(currentChunk.join(' '));
        currentChunk = [];
      }
    }
    
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
    }
    
    if (chunks.length > 1) {
      console.log("[DEBUG] 길이 기준으로 임의 분할:", chunks);
      return chunks;
    }
  }
  
  // 9. 모든 방법이 실패하면 원본 반환
  console.log("[DEBUG] 분할 불가 - 원본 텍스트 반환");
  return [text];
}

// 법적 대응 방안 및 필요 서류 섹션 컴포넌트
function RecommendationSection({ item }: { item: LegalAnalysisItem }) {
  const [expanded, setExpanded] = useState(false);
  const textContent = item.content || "";
  
  // 디버깅을 위해 원본 텍스트 출력
  console.log(`[DEBUG] ${item.title} 원본 텍스트:`, textContent);
  
  // 분할된 항목 얻기
  const listItems = splitNumberedList(textContent);
  console.log(`[DEBUG] ${item.title} 분할 결과:`, listItems);
  
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
      <div className={`px-4 py-3 ${
        item.title.includes("법적 대응") 
          ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300" 
          : item.title.includes("필요 서류") 
            ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300"
            : "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300"
      } font-medium flex items-center justify-between cursor-pointer`}
      onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2">
          {/* 아이콘 부분 유지 */}
          {item.title}
        </div>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
      
      <div className={`p-4 transition-all ${expanded ? 'max-h-[1000px]' : 'max-h-[300px] overflow-y-auto'}`}>
        {listItems.length > 1 ? (
          <ul className="space-y-2">
            {listItems.map((listItem, lIndex) => (
              <li key={lIndex} className="flex items-start">
                <span className="inline-flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full h-6 w-6 mr-2 flex-shrink-0 text-sm mt-0.5">
                  {lIndex + 1}
                </span>
                <span className="text-slate-700 dark:text-slate-300">
                  {listItem.replace(/^\s*(?:\d+[\.\)]|[가-힣][\.\)]|[a-zA-Z][\.\)])\s*/, '')}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line">
            {textContent}
          </p>
        )}
        
        {/* 더 보기 버튼 */}
        {textContent.length > 200 && !expanded && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(true);
            }}
            className="mt-2 text-blue-600 dark:text-blue-400 text-sm font-medium"
          >
            더 보기...
          </button>
        )}
      </div>
    </div>
  );
}

// LegalAnalysisSection 컴포넌트 추가
function LegalAnalysisSection({ item }: { item: LegalAnalysisItem }) {
  const [expanded, setExpanded] = useState(false);
  const content = item.content || "";
  
  // 법률 조항 번호와 내용 강조 함수
  const highlightLegalText = (text: string) => {
    if (!text) return null;
    
    // 법률 조항 패턴 강조 (예: 형법 제347조)
    if (item.title.includes("법률 조항")) {
      return (
        <div className="space-y-3">
          {formatLegalText(text).map((paragraph, pIndex) => {
            // 법률 조항 패턴 감지 (예: 법 제000조)
            const lawPattern = /([가-힣]+\s*제\d+조(?:\s*제\d+항)?(?:\s*제\d+호)?)/g;
            
            // 법률 조항 패턴이 있는 경우 강조
            if (lawPattern.test(paragraph)) {
              // 법률 조항 부분만 강조
              const parts = paragraph.split(lawPattern);
              
              return (
                <div key={pIndex} className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-md border-l-4 border-blue-500">
                  {parts.map((part, partIndex) => {
                    const isLawCode = lawPattern.test(part);
                    if (isLawCode) {
                      return (
                        <span key={partIndex} className="font-bold text-blue-700 dark:text-blue-400">
                          {part}
                        </span>
                      );
                    }
                    return <span key={partIndex}>{part}</span>;
                  })}
                </div>
              );
            }
            
            return (
              <p key={pIndex} className="text-slate-700 dark:text-slate-300">
                {paragraph}
              </p>
            );
          })}
        </div>
      );
    }
    
    // 판례 강조 (예: 대법원 2018다12345)
    if (item.title.includes("판례")) {
      return (
        <div className="space-y-3">
          {formatLegalText(text).map((paragraph, pIndex) => {
            // 판례 번호 패턴 감지
            const casePattern = /(대법원\s*\d+\s*[가-힣]+\s*\d+|서울고등법원\s*\d+\s*[가-힣]+\s*\d+)/g;
            
            if (casePattern.test(paragraph)) {
              // 판례 번호 부분만 강조
              const parts = paragraph.split(casePattern);
              const matches = paragraph.match(casePattern) || [];
              const result: (string | React.ReactNode)[] = [];
              
              parts.forEach((part, i) => {
                result.push(part);
                if (i < matches.length) {
                  result.push(
                    <span key={`match-${i}`} className="font-bold text-indigo-700 dark:text-indigo-400">
                      {matches[i]}
                    </span>
                  );
                }
              });
              
              return (
                <div key={pIndex} className="bg-indigo-50 dark:bg-indigo-900/10 p-3 rounded-md border-l-4 border-indigo-500">
                  {result}
                </div>
              );
            }
            
            return (
              <p key={pIndex} className="text-slate-700 dark:text-slate-300">
                {paragraph}
              </p>
            );
          })}
        </div>
      );
    }
    
    // 기본 텍스트 표시
    return (
      <div className="space-y-2">
        {formatLegalText(text).map((paragraph, pIndex) => (
          <p key={pIndex} className="text-slate-700 dark:text-slate-300">
            {paragraph}
          </p>
        ))}
      </div>
    );
  };
  
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
      <div 
        className={`px-4 py-3 ${
          item.title.includes("법률 조항") 
            ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300" 
            : "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300"
        } font-medium flex items-center justify-between cursor-pointer`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {item.title.includes("법률 조항") ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 7 6 7 18 18 18" />
              <path d="M14 9h1" />
              <path d="M14 12h1" />
              <path d="M14 15h1" />
              <path d="M10 9h1" />
              <path d="M10 12h1" />
              <path d="M10 15h1" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18" />
              <path d="M9 21V9" />
            </svg>
          )}
          {item.title}
        </div>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
      
      <div className={`p-4 transition-all ${expanded ? 'max-h-[1000px]' : 'max-h-[300px] overflow-y-auto'}`}>
        {highlightLegalText(content)}
        
        {content.length > 200 && !expanded && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(true);
            }}
            className="mt-2 text-blue-600 dark:text-blue-400 text-sm font-medium"
          >
            더 보기...
          </button>
        )}
      </div>
    </div>
  );
}

// AI변호사조언 모달 컴포넌트 업데이트
function LawyerAdviceModal({ isOpen, onClose, advice, isLoading }: LawyerAdviceModalProps) {
  if (!isOpen) return null;
  
  // 섹션별로 분할하기 위한 함수
  const formatAdvice = (text: string): AdviceSection[] => {
    if (!text) return [];
    
    // 가능한 섹션 제목들 (성공 가능성, 위험 요소, 법원/상대방 예측 등)
    const sectionTitles = [
      "성공 가능성", "위험 요소", "법원", "상대방", "전략적", "접근법", 
      "협상", "소송", "중요한", "고려사항", "행동 계획", "법적 대응"
    ];
    
    // 정규식 패턴으로 섹션 나누기
    const sections: AdviceSection[] = [];
    const paragraphs = text.split('\n').filter(p => p.trim());
    
    let currentSection: AdviceSection = {
      title: "",
      content: []
    };
    
    for (const paragraph of paragraphs) {
      // 새로운 섹션 제목인지 확인
      const isSectionTitle = sectionTitles.some(title => 
        paragraph.toLowerCase().includes(title.toLowerCase()) && 
        paragraph.length < 100 && 
        (paragraph.includes(":") || paragraph.includes(".") || paragraph.trim().split(" ").length < 10)
      );
      
      if (isSectionTitle && currentSection.content.length > 0) {
        // 이전 섹션 저장하고 새 섹션 시작
        sections.push(currentSection);
        currentSection = {
          title: paragraph,
          content: []
        };
      } else if (isSectionTitle && currentSection.content.length === 0) {
        // 첫 섹션 제목
        currentSection.title = paragraph;
      } else {
        // 내용
        currentSection.content.push(paragraph);
      }
    }
    
    // 마지막 섹션 추가
    if (currentSection.content.length > 0) {
      sections.push(currentSection);
    }
    
    return sections.length > 0 ? sections : [{ title: "", content: text.split('\n').filter(p => p.trim()) }];
  };
  
  const adviceSections = formatAdvice(advice);
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg max-w-3xl w-full max-h-[80vh] overflow-hidden shadow-xl">
        <div className="flex justify-between items-center p-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
              <path d="M15 11h.01" />
              <path d="M11 15h.01" />
              <path d="M16 16h.01" />
              <path d="M17 12h.01" />
              <path d="M22 9h.01" />
              <path d="M15 15h.01" />
              <path d="M18 10h.01" />
              <path d="M18 18h.01" />
              <path d="M2 12a5 5 0 0 0 5 5 8 8 0 0 1 5 2 8 8 0 0 1 5-2 5 5 0 0 0 5-5V7h-5a8 8 0 0 0-5 2 8 8 0 0 0-5-2H2Z" />
            </svg>
            AI변호사의 조언
          </h3>
          <button 
            onClick={onClose}
            className="text-white hover:text-gray-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-130px)]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-slate-600 dark:text-slate-400">AI 법률 조언을 생성하고 있습니다...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {adviceSections.map((section, index) => (
                <div key={index} className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-lg shadow-sm overflow-hidden">
                  {section.title && (
                    <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 font-medium text-blue-700 dark:text-blue-300 border-b">
                      {section.title}
                    </div>
                  )}
                  <div className="p-4">
                    <div className="space-y-3">
                      {section.content.map((paragraph, pIndex) => (
                        <p key={pIndex} className="text-slate-700 dark:text-slate-300">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="border-t p-4 flex justify-end bg-gray-50 dark:bg-slate-800/50">
          <Button 
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            닫기
          </Button>
        </div>
      </div>
    </div>
  );
}

// NextStepsSection 컴포넌트 수정
function NextStepsSection({ nextSteps }: { nextSteps?: string }) {
  // 매개변수가 undefined일 수 있으므로 기본값 처리
  const stepsItems = splitNumberedList(nextSteps || "");
  
  return (
    <div className="p-6 border-b">
      <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        권장 다음 단계
      </h3>
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-5">
        <div className="space-y-4">
          {stepsItems.map((step, index) => (
            <div key={index} className="flex items-start">
              <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300 flex items-center justify-center font-semibold mr-3 mt-0.5 flex-shrink-0">
                {index + 1}
              </div>
              <div className="text-slate-700 dark:text-slate-300">
                {removeListItemNumber(step)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ResultPage() {
  const router = useRouter();
  const [legalIssue, setLegalIssue] = useState<string>("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [legalAdvice, setLegalAdvice] = useState<{
    category: string;
    summary: string;
    legalAnalysis: LegalAnalysisItem[];
    recommendations: LegalAnalysisItem[];
    nextSteps: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [debugInfo, setDebugInfo] = useState<Record<string, unknown> | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);

  // AI변호사조언 관련 상태
  const [isLawyerAdviceModalOpen, setIsLawyerAdviceModalOpen] = useState<boolean>(false);
  const [lawyerAdvice, setLawyerAdvice] = useState<string>("");
  const [isLawyerAdviceLoading, setIsLawyerAdviceLoading] = useState<boolean>(false);

  useEffect(() => {
    // 세션 스토리지에서 데이터 불러오기
    const loadStoredData = () => {
      try {
        const storedAnalysisAnswers = sessionStorage.getItem("analysisAnswers");
        
        if (!storedAnalysisAnswers) {
          setError("법률 분석 데이터를 찾을 수 없습니다. 상담을 다시 시작해주세요.");
          setIsDataLoaded(true);
          return;
        }
        
        // 암호화된 데이터인지 확인
        const isEncrypted = storedAnalysisAnswers.startsWith("eyJ") || storedAnalysisAnswers.indexOf("{") === -1;
        
        let parsedData;
        if (isEncrypted) {
          // 암호화된 데이터 복호화
          parsedData = decryptData(storedAnalysisAnswers);
          if (!parsedData) {
            setError("데이터를 복호화하는 중 오류가 발생했습니다. 상담을 다시 시작해주세요.");
            setIsDataLoaded(true);
            return;
          }
        } else {
          // 이전 방식으로 저장된 데이터 처리
          parsedData = JSON.parse(storedAnalysisAnswers);
        }
        
        if (!parsedData || !parsedData.mainIssue) {
          setError("법률 문제 정보가 없습니다. 상담을 다시 시작해주세요.");
          setIsDataLoaded(true);
          return;
        }
        
        // 유효한 법률 문제 정보가 있으면 분석 데이터 설정
        setLegalIssue(parsedData.mainIssue);
        setAnswers(parsedData);
        setIsDataLoaded(true);
        
        // 자동으로 법률 분석 시작
        fetchLegalAdviceData(parsedData.mainIssue, parsedData);
      } catch (error) {
        console.error("데이터 로드 오류:", error);
        setError("저장된 데이터를 불러오는 중 오류가 발생했습니다. 상담을 다시 시작해주세요.");
        setIsDataLoaded(true);
      }
    };
    
    loadStoredData();
  }, []);

  // 법률 조언 데이터 가져오기
  const fetchLegalAdviceData = async (mainIssue: string, answers: Record<string, string>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("법률 조언 생성 시작...");
      console.log("입력 데이터:", {
        mainIssue,
        answerKeys: Object.keys(answers)
      });
      
      const advice = await generateLegalAdviceWithGemini(
        mainIssue || "",
        answers
      );
      
      console.log("법률 조언 생성 완료:", {
        category: advice.category,
        hasSummary: !!advice.summary,
        analysisCount: advice.legalAnalysis?.length || 0
      });
      
      if (advice) {
        setLegalAdvice(advice);
      } else {
        console.warn("API가 유효한 응답을 반환하지 않았습니다.");
        setError("API가 유효한 응답을 반환하지 않았습니다. 다시 시도해주세요.");
      }
      setIsLoading(false);
    } catch (err) {
      console.error("법률 조언 생성 중 오류 발생:", err);
      setError("법률 조언을 생성하는 중 오류가 발생했습니다. 다시 시도해주세요.");
      setIsLoading(false);
    }
  };

  // 분석 다시 시도
  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    setRetryCount(prev => prev + 1);
  };

  // AI변호사조언 생성 함수
  const handleGetLawyerAdvice = async () => {
    if (!legalAdvice || isLawyerAdviceLoading) return;
    
    setIsLawyerAdviceModalOpen(true);
    setIsLawyerAdviceLoading(true);
    
    try {
      const advice = await generateLawyerAdvice(legalIssue, legalAdvice);
      setLawyerAdvice(advice);
    } catch (err) {
      console.error("변호사 조언 생성 오류:", err);
      setLawyerAdvice("전문 변호사 조언을 생성하는 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLawyerAdviceLoading(false);
    }
  };

  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">법률 분석 중...</h2>
          <p className="text-slate-500 mb-6">귀하의 상황을 분석하고 있습니다. 잠시만 기다려주세요.</p>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4 text-red-500">오류 발생</h2>
          <p className="text-slate-700 dark:text-slate-300 mb-6">{error}</p>
          <div className="flex flex-col md:flex-row gap-3 justify-center">
            <Button variant="outline" onClick={() => router.push("/consult")}>
              상담 다시 시작
            </Button>
            <Button variant="primary" onClick={handleRetry}>
              다시 시도하기
            </Button>
          </div>
          <p className="mt-6 text-sm text-slate-500">
            문제가 지속된다면 법률 문제를 간결하고 명확하게 설명해 보세요.
          </p>
          {process.env.NODE_ENV === 'development' && debugInfo && (
            <div className="mt-8 p-4 bg-slate-100 dark:bg-slate-700 rounded text-left text-xs overflow-x-auto">
              <h4 className="font-bold mb-2">디버그 정보:</h4>
              <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8 bg-slate-50 dark:bg-slate-900">
      {/* LawyerAdvice 모달 추가 */}
      <LawyerAdviceModal 
        isOpen={isLawyerAdviceModalOpen}
        onClose={() => setIsLawyerAdviceModalOpen(false)}
        advice={lawyerAdvice}
        isLoading={isLawyerAdviceLoading}
      />
      
      <div className="max-w-4xl w-full mt-4 md:mt-8">
        <nav className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="group">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              홈으로 돌아가기
            </Button>
          </Link>
        </nav>
        
        <Card className="w-full mb-8 border-0 shadow-md overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div>
                <CardTitle className="text-2xl md:text-3xl">법률 분석 결과</CardTitle>
                <CardDescription className="text-blue-50">
                  {formatDate(new Date())}에 생성된 법률 자문
                </CardDescription>
              </div>
              <div className="px-4 py-2 bg-white/20 text-white rounded-full text-sm font-medium backdrop-blur-sm self-start">
                {legalAdvice?.category ?? "법률 자문"}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {/* 요약 섹션 */}
            <div className="p-6 border-b">
              <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                요약
              </h3>
              <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-4 text-slate-700 dark:text-slate-300">
                {legalAdvice?.summary ?? "법률 자문 결과"}
              </div>
            </div>
            
            {/* 법률 분석 섹션 */}
            <div className="p-6 border-b">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                법률 분석
              </h3>
              <div className="space-y-5">
                {legalAdvice?.legalAnalysis.map((item: LegalAnalysisItem, index: number) => (
                  <LegalAnalysisSection key={index} item={item} />
                ))}
              </div>
            </div>
            
            {/* 대응 방안 섹션 */}
            <div className="p-6 border-b">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
                대응 방안
              </h3>
              <div className="space-y-5">
                {legalAdvice?.recommendations.map((item: LegalAnalysisItem, index: number) => (
                  <RecommendationSection key={index} item={item} />
                ))}
              </div>
            </div>
            
            {/* 다음 단계 섹션 */}
            <NextStepsSection nextSteps={legalAdvice?.nextSteps} />
            
            {/* 주의사항 */}
            <div className="p-6">
              <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                <h3 className="text-lg font-semibold mb-2 text-yellow-700 dark:text-yellow-400 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  주의사항
                </h3>
                <p className="text-yellow-800 dark:text-yellow-300 opacity-90 text-sm">
                  본 법률 자문은 일반적인 정보 제공 목적으로 작성되었으며, 구체적인 법률 조언을 대체할 수 없습니다. 복잡한 법적 문제는 반드시 변호사와 상담하시기 바랍니다.
                </p>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="p-6 pt-4 border-t bg-slate-50 dark:bg-slate-800/50 flex justify-center">
            <div className="flex gap-4 w-full">
              <Button 
                variant="outline" 
                className="flex-1 flex items-center justify-center gap-2 h-12 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-900/20"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
                <Link href="/consult" className="w-full text-center">새 상담 시작</Link>
              </Button>
              
              <Button 
                onClick={handleGetLawyerAdvice}
                disabled={isLawyerAdviceLoading}
                className="flex-1 flex items-center justify-center gap-2 h-12 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <path d="M15 11h.01" />
                  <path d="M11 15h.01" />
                  <path d="M16 16h.01" />
                  <path d="M17 12h.01" />
                  <path d="M22 9h.01" />
                  <path d="M15 15h.01" />
                  <path d="M18 10h.01" />
                  <path d="M18 18h.01" />
                  <path d="M2 12a5 5 0 0 0 5 5 8 8 0 0 1 5 2 8 8 0 0 1 5-2 5 5 0 0 0 5-5V7h-5a8 8 0 0 0-5 2 8 8 0 0 0-5-2H2Z" />
                </svg>
                AI변호사의 조언
                {isLawyerAdviceLoading && (
                  <span className="ml-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                )}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
} 