import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { load } from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'temp', 'step-1', 'data');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Logging utility - writes to both console and log file
const logWriters = new Map();

function getLogWriter(year) {
  if (!logWriters.has(year)) {
    const yearDir = path.join(dataDir, year.toString());
    if (!fs.existsSync(yearDir)) {
      fs.mkdirSync(yearDir, { recursive: true });
    }
    const logPath = path.join(yearDir, 'log.txt');
    const logStream = fs.createWriteStream(logPath, { flags: 'a' });
    logWriters.set(year, logStream);
  }
  return logWriters.get(year);
}

function log(year, message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(message);
  
  if (year) {
    const logStream = getLogWriter(year);
    logStream.write(logMessage + '\n');
  }
}

function closeLogWriters() {
  for (const [year, stream] of logWriters.entries()) {
    stream.end();
  }
  logWriters.clear();
}

/**
 * Fetches HTML content from a URL
 */
async function fetchHTML(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    // Note: console.error is used here as it's an error, not regular logging
    console.error(`Error fetching ${url}:`, error.message);
    return null;
  }
}

/**
 * Fetches and extracts text content from a URL
 */
export async function fetchContentFromUrl(url) {
  const html = await fetchHTML(url);
  if (!html) {
    return null;
  }

  const $ = load(html);
  
  // Remove unwanted elements that shouldn't be in the content
  $('script, style, nav, header, footer, .navigation, .footer, .header, .sidebar, .menu, .breadcrumb, .skip-link, .social-share, .print-button, .back-button').remove();
  
  // Try to find main content area - prioritize more specific selectors
  let content = '';
  const contentSelectors = [
    'article .content',
    'article main',
    'main article',
    'article',
    'main',
    '.article-content',
    '.post-content',
    '.entry-content',
    '.content',
    '.main-content',
    '#content'
  ];
  
  let $mainContent = null;
  for (const selector of contentSelectors) {
    $mainContent = $(selector).first();
    if ($mainContent.length > 0) {
      break;
    }
  }
  
  if ($mainContent && $mainContent.length > 0) {
    // Extract text from the first (most specific) main content area only
    content = $mainContent.text();
  } else {
    // Fallback: extract from body, but be more selective
    const $body = $('body');
    // Remove navigation and footer elements
    $body.find('nav, footer, header, .navigation, .footer, .header, .sidebar, .menu, .breadcrumb, .social-share, .print-button').remove();
    
    // Try to find the largest content block (likely the main article)
    let largestContent = '';
    let largestSize = 0;
    
    $body.find('div, section, article').each((i, elem) => {
      const $elem = $(elem);
      const text = $elem.text().trim();
      // Skip if it's too short (likely navigation or small elements)
      if (text.length > 100 && text.length > largestSize) {
        // Check if it contains substantial content (not just navigation)
        const hasSubstantialContent = text.split(/\s+/).length > 50;
        if (hasSubstantialContent) {
          largestContent = text;
          largestSize = text.length;
        }
      }
    });
    
    content = largestContent || $body.text();
  }
  
  // Clean up the content thoroughly
  content = content
    // Remove any remaining HTML entities and tags (safety check)
    .replace(/<[^>]*>/g, '') // Remove any HTML tags that might remain
    .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
    .replace(/&amp;/g, '&') // Replace HTML entities
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Normalize whitespace
    .replace(/[ \t]+/g, ' ') // Replace multiple spaces/tabs with single space
    .replace(/\n[ \t]+/g, '\n') // Remove spaces/tabs at start of lines
    .replace(/[ \t]+\n/g, '\n') // Remove spaces/tabs at end of lines
    .replace(/\n{3,}/g, '\n\n') // Replace 3+ newlines with 2
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\r/g, '\n') // Normalize line endings
    .split('\n')
    .map(line => line.trim()) // Trim each line
    .filter(line => line.length > 0) // Remove empty lines
    .join('\n')
    .trim();
  
  // Deduplicate: remove repeated paragraphs/sections
  const lines = content.split('\n');
  const seen = new Set();
  const uniqueLines = [];
  
  for (const line of lines) {
    // Normalize line for comparison (lowercase, remove extra spaces)
    const normalized = line.toLowerCase().replace(/\s+/g, ' ').trim();
    
    // Skip if we've seen this exact line before (and it's substantial)
    if (normalized.length > 20 && seen.has(normalized)) {
      continue;
    }
    
    // Skip if this line is a duplicate of a recent line (within last 5 lines)
    let isRecentDuplicate = false;
    if (normalized.length > 20) {
      for (let i = Math.max(0, uniqueLines.length - 5); i < uniqueLines.length; i++) {
        const recentNormalized = uniqueLines[i].toLowerCase().replace(/\s+/g, ' ').trim();
        if (normalized === recentNormalized && normalized.length > 20) {
          isRecentDuplicate = true;
          break;
        }
      }
    }
    
    if (!isRecentDuplicate) {
      seen.add(normalized);
      uniqueLines.push(line);
    }
  }
  
  content = uniqueLines.join('\n').trim();
  
  return content || null;
}

/**
 * Extracts decision dates and their links from a year page
 * Structure: Date headings (e.g., "22. desember") followed by links (Pressemelding, Innledning til pressekonferanse)
 */
export function parseYearPage(html, year) {
  const $ = load(html);
  const decisions = [];
  const baseUrl = `https://www.norges-bank.no/tema/pengepolitikk/Rentemoter/${year}-Rentemoter/`;

  // Get all elements in document order
  const allElements = $('body *').toArray();
  const dateElements = [];
  
  // First pass: identify all date heading elements
  for (const elem of allElements) {
    const $elem = $(elem);
    const text = $elem.text().trim();
    
    // Only check if text is short (date headings are typically short)
    if (text.length > 0 && text.length < 50) {
      const dateMatch = extractDate(text, null, year);
      
      if (dateMatch) {
        const tagName = elem.tagName?.toLowerCase();
        // Look for headings, strong tags, or elements that are likely date headings
        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong'].includes(tagName)) {
          dateElements.push({
            element: elem,
            $elem: $elem,
            text: text,
            dateMatch: dateMatch,
            index: allElements.indexOf(elem)
          });
        }
      }
    }
  }

  // Second pass: for each date, collect only links that appear after it and before the next date
  for (let i = 0; i < dateElements.length; i++) {
    const dateInfo = dateElements[i];
    const { year: y, month, date } = dateInfo.dateMatch;
    const links = [];
    
    // Find the next date element's index to know where to stop
    const nextDateIndex = i + 1 < dateElements.length 
      ? dateElements[i + 1].index 
      : allElements.length;
    
    // Collect links from elements that appear after this date and before the next date
    for (let j = dateInfo.index + 1; j < nextDateIndex; j++) {
      const elem = allElements[j];
      const $elem = $(elem);
      
      // Only process anchor tags
      if (elem.tagName?.toLowerCase() === 'a') {
        const href = $elem.attr('href');
        const linkText = $elem.text().trim();
        
        // Only collect links that are "Pressemelding" or "Innledning til pressekonferanse"
        if (href && (linkText === 'Pressemelding' || 
                     linkText === 'Innledning til pressekonferanse (bakgrunn for rentebeslutningen)' ||
                     linkText.includes('Pressemelding') ||
                     linkText.includes('Innledning'))) {
          const fullUrl = href.startsWith('http') 
            ? href 
            : new URL(href, baseUrl).href;
          
          // Avoid duplicates
          if (!links.some(l => l.url === fullUrl)) {
            links.push({
              text: linkText,
              url: fullUrl
            });
          }
        }
      }
    }
    
    if (links.length > 0) {
      decisions.push({
        year: y,
        month: month.toString().padStart(2, '0'),
        date: date.toString().padStart(2, '0'),
        links: links
      });
    }
  }

  // Remove duplicates (shouldn't be needed, but just in case)
  const uniqueDecisions = [];
  const seen = new Set();
  for (const decision of decisions) {
    const key = `${decision.year}-${decision.month}-${decision.date}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueDecisions.push(decision);
    }
  }

  return uniqueDecisions;
}

/**
 * Extracts date from text or URL
 * Handles Norwegian date formats like "22. desember 1999", "22 desember 1999", "22/12/1999", etc.
 */
export function extractDate(text, href, defaultYear) {
  if (!text && !href) return null;

  const searchText = (text || href || '').toLowerCase();
  
  // Norwegian month names
  const months = {
    'januar': 1, 'februar': 2, 'mars': 3, 'april': 4, 'mai': 5, 'juni': 6,
    'juli': 7, 'august': 8, 'september': 9, 'oktober': 10, 'november': 11, 'desember': 12
  };

  // Pattern 1: "22. desember 1999" or "22 desember 1999"
  for (const [monthName, monthNum] of Object.entries(months)) {
    const pattern = new RegExp(`(\\d{1,2})\\s*\\.?\\s*${monthName}\\s+(\\d{4})`, 'i');
    const match = searchText.match(pattern);
    if (match) {
      return {
        year: parseInt(match[2]),
        month: monthNum,
        date: parseInt(match[1])
      };
    }
  }

  // Pattern 2: "22/12/1999" or "22-12-1999" or "1999-12-22"
  const datePatterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,  // DD/MM/YYYY or DD-MM-YYYY
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,  // YYYY/MM/DD or YYYY-MM-DD
  ];

  for (const pattern of datePatterns) {
    const match = searchText.match(pattern);
    if (match) {
      if (pattern === datePatterns[0]) {
        // DD/MM/YYYY
        return {
          year: parseInt(match[3]),
          month: parseInt(match[2]),
          date: parseInt(match[1])
        };
      } else {
        // YYYY/MM/DD
        return {
          year: parseInt(match[1]),
          month: parseInt(match[2]),
          date: parseInt(match[3])
        };
      }
    }
  }

  // Pattern 3: Just day and month, use default year
  for (const [monthName, monthNum] of Object.entries(months)) {
    const pattern = new RegExp(`(\\d{1,2})\\s*\\.?\\s*${monthName}`, 'i');
    const match = searchText.match(pattern);
    if (match && defaultYear) {
      return {
        year: defaultYear,
        month: monthNum,
        date: parseInt(match[1])
      };
    }
  }

  return null;
}


/**
 * Creates a markdown file from template
 */
export function createMarkdownFile(year, month, date, links, contents, fetchTime) {
  const title = `# Rentebeslutninger ${year}-${month}-${date}`;
  const fetchInfo = `* Information Fetched : ${fetchTime}`;
  
  // Build Data section with content from each URL
  let dataSection = `## Data\n\n`;
  
  if (contents && contents.length > 0) {
    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      const content = contents[i];
      
      if (content) {
        dataSection += `### Source: [${link.text}](${link.url})\n\n`;
        dataSection += `${content}\n\n`;
      }
    }
  }
  
  const linksSection = links.length > 0
    ? `## Resources\n\n${links.map(link => `- [${link.text}](${link.url})`).join('\n')}`
    : `## Resources\n\n`;

  return `${title}\n\n${fetchInfo}\n\n${dataSection}\n\n${linksSection}\n`;
}

/**
 * Main function to process all years
 */
async function main() {
  const years = [1999, 2000, 2001, 2002, 2003, 2004, 2005, 2006];
  //const years = [1999];
  const fetchTime = new Date().toISOString();

  log(null, 'Starting to fetch Rentebeslutninger...\n');

  try {
    for (const year of years) {
      log(year, `Processing year ${year}...`);
      
      const yearUrl = `https://www.norges-bank.no/tema/pengepolitikk/Rentemoter/${year}-Rentemoter/`;
      const html = await fetchHTML(yearUrl);
      
      if (!html) {
        log(year, `  ⚠️  Could not fetch page for year ${year}`);
        continue;
      }

      const decisions = parseYearPage(html, year);
      log(year, `  Found ${decisions.length} decision(s) for year ${year}`);

      for (const decision of decisions) {
        const dirPath = path.join(dataDir, decision.year.toString(), decision.month, decision.date);
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }

        // Fetch content from each URL
        const contents = [];
        const links = decision.links || [];
        
        log(year, `    Fetching content for ${decision.year}-${decision.month}-${decision.date}...`);
        for (let i = 0; i < links.length; i++) {
          const link = links[i];
          log(year, `      Fetching: ${link.url}`);
          const content = await fetchContentFromUrl(link.url);
          contents.push(content);
          
          // Add a small delay between requests to be respectful
          if (i < links.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        // Create markdown file with links and fetched content
        const markdown = createMarkdownFile(
          decision.year,
          decision.month,
          decision.date,
          links,
          contents,
          fetchTime
        );

        const filePath = path.join(dirPath, 'info.md');
        fs.writeFileSync(filePath, markdown, 'utf-8');
        log(year, `    ✓ Created ${filePath} with ${links.length} link(s) and content`);
      }

      log(year, `  ✓ Completed year ${year}\n`);
      
      // Add a delay between years
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    log(null, '✅ All years processed!');
  } finally {
    // Close all log file streams
    closeLogWriters();
  }
}

// Run the script if executed directly (not imported)
// Check if this file is being run directly
const isMainModule = process.argv[1] && 
  (process.argv[1].endsWith('1-scan-for-available-reports.js') ||
   process.argv[1].includes('1-scan-for-available-reports'));

if (isMainModule) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    closeLogWriters();
    process.exit(1);
  });
}

