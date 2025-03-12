import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines multiple class names into a single string using clsx and twMerge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date object to a localized string
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Generate a unique ID for use in the application
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * 간단한 데이터 암호화 (클라이언트 스토리지용)
 * 참고: 이는 완전한 암호화가 아니며, 전문적인 보안이 필요한 경우 더 강력한 암호화 라이브러리 사용 권장
 * 유니코드 문자(한글 등)도 처리할 수 있도록 encodeURIComponent 사용
 */
export function encryptData(data: Record<string, unknown> | string): string {
  try {
    // 데이터를 JSON 문자열로 변환
    const jsonString = typeof data === 'string' ? data : JSON.stringify(data);
    
    // 유니코드 문자를 처리하기 위해 encodeURIComponent 사용
    const encodedString = encodeURIComponent(jsonString);
    
    // Base64 인코딩으로 간단하게 변환
    return btoa(encodedString);
  } catch (error) {
    console.error("데이터 암호화 오류:", error);
    // 오류 발생 시 원본 JSON 문자열 반환 (최소한의 fallback)
    return typeof data === 'string' ? data : JSON.stringify(data);
  }
}

/**
 * 암호화된 데이터 복호화
 * 유니코드 문자(한글 등)도 처리할 수 있도록 decodeURIComponent 사용
 */
export function decryptData(encryptedData: string): Record<string, unknown> | null {
  try {
    // Base64 디코딩
    const decodedString = atob(encryptedData);
    
    // URL 디코딩으로 유니코드 문자 복원
    const jsonString = decodeURIComponent(decodedString);
    
    // JSON 파싱
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("데이터 복호화 오류:", error);
    
    // 기존 방식으로도 시도해 보기 (이전 데이터와의 호환성)
    try {
      return JSON.parse(encryptedData);
    } catch (e) {
      console.error("기존 방식으로도 복호화 실패:", e);
      return null;
    }
  }
} 