import React from 'react';
import { cn } from '@/lib/utils';

// Regex to detect Arabic characters (including harakat/diacritics)
const ARABIC_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

export const containsArabic = (text: string): boolean => {
  return ARABIC_REGEX.test(text);
};

// Function to wrap Arabic text segments with proper styling
// Uses dir="auto" and unicode-bidi: plaintext to handle mixed content correctly
export const formatArabicContent = (html: string): string => {
  if (!html || !containsArabic(html)) return html;
  
  // Use dir="auto" to let the browser determine direction per paragraph
  // This prevents issues with punctuation and numbers in mixed content
  return `<div class="bidi-arabic-content" dir="auto" style="unicode-bidi: plaintext;">${html}</div>`;
};

interface ArabicTextProps {
  children: React.ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

export const ArabicText: React.FC<ArabicTextProps> = ({ 
  children, 
  className,
  as: Component = 'span' 
}) => {
  const text = typeof children === 'string' ? children : '';
  const isArabic = containsArabic(text);
  
  return React.createElement(
    Component,
    {
      className: cn(
        isArabic && 'font-arabic',
        className
      ),
      dir: isArabic ? 'rtl' : undefined,
      lang: isArabic ? 'ar' : undefined,
    },
    children
  );
};

// Hook to check if content contains Arabic
export const useArabicDetection = (content: string) => {
  return React.useMemo(() => containsArabic(content), [content]);
};

// Component to render HTML content with automatic Arabic detection
// Uses dir="auto" for proper bidirectional text handling
interface ArabicHtmlContentProps {
  html: string;
  className?: string;
}

export const ArabicHtmlContent: React.FC<ArabicHtmlContentProps> = ({ 
  html, 
  className 
}) => {
  return (
    <div 
      className={cn(
        "prose prose-sm max-w-none dark:prose-invert bidi-content",
        className
      )}
      dir="auto"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
