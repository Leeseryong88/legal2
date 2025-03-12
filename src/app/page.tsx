"use client";

import Link from "next/link";
import { FileText, Search, FileCheck, Check } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8 bg-slate-50 dark:bg-slate-900">
      <div className="max-w-3xl w-full text-center space-y-8">
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white">
          지금 바로 법률 상담을 시작하세요
        </h1>
        
        <p className="text-lg text-slate-600 dark:text-slate-300">
          복잡한 법률 문제에 혼자 고민하지 마세요. 생성형 AI 기반 법률 상담 서비스로 빠르고 정확한 조언을 받아보세요.
        </p>
        
        <div className="mt-8 space-y-6">
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <Link href="/consult" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-md">
              법률 상담 시작하기
            </Link>
          </div>
        </div>
      </div>

      {/* 서비스 특징 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full mt-16">
        <FeatureCard
          icon={<FileText className="h-12 w-12 text-indigo-500" />}
          title="법률 진단"
          description="법률 문제를 분석하고 관련 법조항을 찾아드립니다."
          details="귀하의 상황을 입력하면 첨단 AI 기술이 해당 문제를 분석하고 관련 법률 조항과 판례를 찾아드립니다."
        />
        
        <FeatureCard
          icon={<Search className="h-12 w-12 text-indigo-500" />}
          title="법률 검토"
          description="문서와 계약서 검토에 도움을 드립니다."
          details="계약서나 법률 문서에 대한 용어 설명과 주의점을 제공하며, 문서 내용의 법적 의미를 이해하는 데 도움을 드립니다."
        />
        
        <FeatureCard
          icon={<FileCheck className="h-12 w-12 text-indigo-500" />}
          title="대응 전략"
          description="효과적인 법적 대응 방안을 제시합니다."
          details="법률 문제에 대한 구체적인 대응 방안, 필요한 서류, 전문가 상담 필요성 및 다음 단계에 대한 조언을 제공합니다."
        />
      </div>
      
      {/* 기술 활용 섹션 */}
      <div className="max-w-6xl w-full mt-24 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-4">
          최신 AI 기술 활용
        </h2>
        <p className="text-lg text-slate-600 dark:text-slate-300 mb-16">
          최신 생성형 AI 기술을 활용하여 정확하고 신뢰할 수 있는 법률 정보를 제공합니다.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <TechCard
            title="고급 법률 분석 시스템"
            description="첨단 AI 기술은 방대한 법률 텍스트와 관련 판례를 학습하여 사용자의 상황에 맞는 맞춤형 법률 정보를 제공합니다."
            features={[
              "신속한 법률 카테고리 분류",
              "관련 법 조항 및 판례 검색",
              "체계적인 대응 방안 제시",
              "사용자 상황에 최적화된 분석"
            ]}
          />
          
          <TechCard
            title="서비스 데이터 처리"
            description="사용자의 개인 정보 보호를 최우선으로 하며, 모든 데이터는 안전하게 처리됩니다."
            features={[
              "민감 정보의 안전한 처리",
              "세션 기반 데이터 관리로 개인정보 보호",
              "법률 분석에 필요한 최소한의 정보만 수집",
              "분석 완료 후 데이터 자동 삭제"
            ]}
          />
        </div>
      </div>
    </main>
  );
}

// 특징 카드 컴포넌트
function FeatureCard({ icon, title, description, details }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  details: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-center mb-4">
          {icon}
        </div>
        <h3 className="text-xl font-bold text-center text-slate-900 dark:text-white mb-2">{title}</h3>
        <p className="text-slate-600 dark:text-slate-300 text-center mb-4">{description}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{details}</p>
      </div>
    </div>
  );
}

// 기술 카드 컴포넌트
function TechCard({ title, description, features }: {
  title: string;
  description: string;
  features: string[];
}) {
  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md text-left">
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{title}</h3>
      <p className="text-slate-600 dark:text-slate-300 mb-4">{description}</p>
      <ul className="space-y-2">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
            <span className="text-slate-700 dark:text-slate-300">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
