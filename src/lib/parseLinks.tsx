import React from 'react';

// URL regex pattern that matches common URL formats including www.
const URL_REGEX = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+|www\.[^\s<>"{}|\\^`\[\]]+)/gi;

// Characters that are often at the end of URLs but shouldn't be part of the link
const TRAILING_PUNCTUATION = /[.,;:!?)\]}>'"]+$/;

/**
 * Cleans up a URL by removing trailing punctuation that may have been captured
 */
function cleanUrl(url: string): string {
  return url.replace(TRAILING_PUNCTUATION, '');
}

/**
 * Ensures a URL has a protocol for href
 */
function ensureProtocol(url: string): string {
  if (url.startsWith('www.')) {
    return `https://${url}`;
  }
  return url;
}

/**
 * Parses a text string and returns React elements with clickable links
 */
export function parseMessageWithLinks(text: string): React.ReactNode[] {
  if (!text) return [];
  
  const parts = text.split(URL_REGEX);
  const result: React.ReactNode[] = [];
  
  parts.forEach((part, index) => {
    if (!part) return;
    
    // Check if this part matches a URL pattern
    const isUrl = /^(https?:\/\/|www\.)/i.test(part);
    
    if (isUrl) {
      const cleanedUrl = cleanUrl(part);
      const trailingChars = part.slice(cleanedUrl.length);
      const href = ensureProtocol(cleanedUrl);
      
      result.push(
        <a
          key={`link-${index}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 underline break-all cursor-pointer hover:text-blue-300"
        >
          {cleanedUrl}
        </a>
      );
      
      // Add back any trailing punctuation as plain text
      if (trailingChars) {
        result.push(trailingChars);
      }
    } else {
      result.push(part);
    }
  });
  
  return result;
}

/**
 * Extracts all URLs from a text string
 */
export function extractUrls(text: string): string[] {
  if (!text) return [];
  const matches = text.match(URL_REGEX);
  if (!matches) return [];
  return matches.map(cleanUrl);
}
