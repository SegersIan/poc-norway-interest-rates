# Tests

This directory contains unit tests for the `1-scan-for-available-reports.js` script.

## Running Tests

Run all tests:
```bash
npm test
```

Run tests in watch mode (re-runs on file changes):
```bash
npm run test:watch
```

Run a specific test file:
```bash
node --test tests/extractDate.test.js
```

## Test Files

### `extractDate.test.js`
Tests the `extractDate()` function which parses Norwegian date formats:
- Norwegian date formats (e.g., "22. desember 1999")
- Numeric date formats (e.g., "22/12/1999", "1999-12-22")
- All Norwegian month names
- Case insensitivity
- Invalid input handling

### `createMarkdownFile.test.js`
Tests the `createMarkdownFile()` function which generates markdown files:
- Basic structure validation
- Links section generation
- Data section with content
- Multiple links and contents
- Handling of null/empty content

### `parseYearPage.test.js`
Tests the `parseYearPage()` function which parses HTML to extract decisions:
- Finding dates in HTML
- Extracting associated links
- URL conversion (relative to absolute)
- Filtering for Pressemelding and Innledning links only
- Handling dates without links
- Duplicate removal

### `fetchContentFromUrl.test.js`
Tests the `fetchContentFromUrl()` function which fetches and extracts content:
- Handling invalid URLs
- HTML tag removal (requires mocking for full testing)
- Content extraction (requires mocking for full testing)

## Test Framework

Tests use Node.js built-in test runner (available in Node.js 18+). No additional dependencies required.

## Adding New Tests

1. Create a new test file: `tests/yourFunction.test.js`
2. Import the function to test: `import { yourFunction } from '../scripts/1-scan-for-available-reports.js';`
3. Use Node.js test API:
   ```javascript
   import { test } from 'node:test';
   import assert from 'node:assert';
   
   test('your test name', () => {
     assert.strictEqual(actual, expected);
   });
   ```

