import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI 법률 어드바이저 - 쉽고 정확한 법률 자문",
  description: "AI 기반 법률 자문 서비스로 복잡한 법률 문제를 쉽게 이해하고 대응하세요.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <div className="flex flex-col min-h-screen">
          <header className="border-b bg-white dark:bg-slate-950">
            <div className="container mx-auto px-4 py-4 flex items-center justify-between">
              <Link href="/" className="text-2xl font-bold text-blue-600">
                AI 법률 어드바이저
              </Link>
              <nav className="flex items-center space-x-6">
                <Link href="/consult" className="text-slate-700 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400">
                  상담하기
                </Link>
              </nav>
            </div>
          </header>
          
          <main className="flex-grow">
            {children}
          </main>
          
          <footer className="border-t bg-slate-50 dark:bg-slate-900">
            <div className="container mx-auto px-4 py-6">
              <div className="flex flex-col items-center text-center">
                <Link href="/" className="text-xl font-bold text-blue-600 mb-3">
                  AI 법률 어드바이저
                </Link>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  복잡한 법률 문제를 쉽게 이해하고 적절한 법적 조언을 받을 수 있는 서비스입니다.
                </p>
                
                <div className="mt-4 text-center text-sm text-slate-500">
                  <p>© {new Date().getFullYear()} AI 법률 어드바이저. All rights reserved.</p>
                  <p className="mt-2">본 서비스는 법률 정보 제공을 목적으로 하며, 구체적인 법률 조언을 대체할 수 없습니다.</p>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
