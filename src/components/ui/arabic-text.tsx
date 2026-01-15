import React from 'react';
import { cn } from '@/lib/utils';

// Regex to detect Arabic characters (including harakat/diacritics)
const ARABIC_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

export const containsArabic = (text: string): boolean => {
  return ARABIC_REGEX.test(text);
};

// Function to wrap Arabic text segments with proper styling
export const formatArabicContent = (html: string): string => {
  if (!html || !containsArabic(html)) return html;
  
  // If the content contains Arabic, wrap the entire content with Arabic styling
  return `<div class="arabic-content" style="font-family: 'Scheherazade New', 'Amiri', serif; direction: rtl; text-align: right; font-size: 1.3em; line-height: 2; font-feature-settings: 'liga' 1, 'calt' 1;">${html}</div>`;
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
interface ArabicHtmlContentProps {
  html: string;
  className?: string;
}

export const ArabicHtmlContent: React.FC<ArabicHtmlContentProps> = ({ 
  html, 
  className 
}) => {
  const hasArabic = containsArabic(html);
  
  return (
    <div 
      className={cn(
        "prose prose-sm max-w-none dark:prose-invert",
        hasArabic && "font-arabic",
        className
      )}
      dir={hasArabic ? "rtl" : undefined}
      lang={hasArabic ? "ar" : undefined}
      style={hasArabic ? {
        fontFamily: "'Scheherazade New', 'Amiri', serif",
        fontSize: '1.3em',
        lineHeight: 2,
        fontFeatureSettings: "'liga' 1, 'calt' 1"
      } : undefined}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
