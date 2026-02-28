import React from 'react';
import { parseMessageWithLinks } from '@/lib/parseLinks';
import { cn } from '@/lib/utils';

interface ClickableTextProps {
  text: string;
  className?: string;
  as?: 'span' | 'p' | 'div';
}

/**
 * A component that renders text with URLs automatically converted to clickable links.
 * Use this anywhere you need to render user-generated text that might contain URLs.
 */
export function ClickableText({ text, className, as: Component = 'span' }: ClickableTextProps) {
  const parsedContent = parseMessageWithLinks(text);
  
  return (
    <Component className={cn('whitespace-pre-wrap', className)}>
      {parsedContent}
    </Component>
  );
}
