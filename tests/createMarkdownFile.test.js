import { test } from 'node:test';
import assert from 'node:assert';
import { createMarkdownFile } from '../scripts/1-scan-for-available-reports.js';

test('createMarkdownFile - Basic structure', () => {
  const result = createMarkdownFile('1999', '01', '27', [], [], '2025-12-07T12:00:00.000Z');
  
  assert(result.includes('# Rentebeslutninger 1999-01-27'));
  assert(result.includes('* Information Fetched : 2025-12-07T12:00:00.000Z'));
  assert(result.includes('## Data'));
  assert(result.includes('## Resources'));
});

test('createMarkdownFile - With links but no content', () => {
  const links = [
    { text: 'Pressemelding', url: 'https://example.com/press' },
    { text: 'Innledning', url: 'https://example.com/innledning' }
  ];
  
  const result = createMarkdownFile('1999', '01', '27', links, [], '2025-12-07T12:00:00.000Z');
  
  assert(result.includes('- [Pressemelding](https://example.com/press)'));
  assert(result.includes('- [Innledning](https://example.com/innledning)'));
  assert(!result.includes('### Source:'));
});

test('createMarkdownFile - With links and content', () => {
  const links = [
    { text: 'Pressemelding', url: 'https://example.com/press' }
  ];
  const contents = ['This is the press release content'];
  
  const result = createMarkdownFile('1999', '01', '27', links, contents, '2025-12-07T12:00:00.000Z');
  
  assert(result.includes('### Source: [Pressemelding](https://example.com/press)'));
  assert(result.includes('This is the press release content'));
  assert(result.includes('- [Pressemelding](https://example.com/press)'));
});

test('createMarkdownFile - Multiple links and contents', () => {
  const links = [
    { text: 'Pressemelding', url: 'https://example.com/press' },
    { text: 'Innledning', url: 'https://example.com/innledning' }
  ];
  const contents = [
    'Press release content here',
    'Innledning content here'
  ];
  
  const result = createMarkdownFile('1999', '01', '27', links, contents, '2025-12-07T12:00:00.000Z');
  
  assert(result.includes('### Source: [Pressemelding](https://example.com/press)'));
  assert(result.includes('Press release content here'));
  assert(result.includes('### Source: [Innledning](https://example.com/innledning)'));
  assert(result.includes('Innledning content here'));
  assert(result.includes('- [Pressemelding](https://example.com/press)'));
  assert(result.includes('- [Innledning](https://example.com/innledning)'));
});

test('createMarkdownFile - Skips null/empty content', () => {
  const links = [
    { text: 'Pressemelding', url: 'https://example.com/press' },
    { text: 'Innledning', url: 'https://example.com/innledning' }
  ];
  const contents = [
    'Valid content',
    null,
    ''
  ];
  
  const result = createMarkdownFile('1999', '01', '27', links, contents, '2025-12-07T12:00:00.000Z');
  
  assert(result.includes('### Source: [Pressemelding](https://example.com/press)'));
  assert(result.includes('Valid content'));
  // Should not include source headers for null/empty content
  const sourceHeaders = (result.match(/### Source:/g) || []).length;
  assert.strictEqual(sourceHeaders, 1);
});

