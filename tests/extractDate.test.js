import { test } from 'node:test';
import assert from 'node:assert';
import { extractDate } from '../scripts/1-scan-for-available-reports.js';

test('extractDate - Norwegian date format with year', () => {
  const result = extractDate('22. desember 1999', null, null);
  assert.deepStrictEqual(result, { year: 1999, month: 12, date: 22 });
});

test('extractDate - Norwegian date format without dot', () => {
  const result = extractDate('22 desember 1999', null, null);
  assert.deepStrictEqual(result, { year: 1999, month: 12, date: 22 });
});

test('extractDate - Norwegian date format with default year', () => {
  const result = extractDate('27. januar', null, 1999);
  assert.deepStrictEqual(result, { year: 1999, month: 1, date: 27 });
});

test('extractDate - Numeric format DD/MM/YYYY', () => {
  const result = extractDate('22/12/1999', null, null);
  assert.deepStrictEqual(result, { year: 1999, month: 12, date: 22 });
});

test('extractDate - Numeric format DD-MM-YYYY', () => {
  const result = extractDate('22-12-1999', null, null);
  assert.deepStrictEqual(result, { year: 1999, month: 12, date: 22 });
});

test('extractDate - Numeric format YYYY-MM-DD', () => {
  const result = extractDate('1999-12-22', null, null);
  assert.deepStrictEqual(result, { year: 1999, month: 12, date: 22 });
});

test('extractDate - All Norwegian months', () => {
  const months = [
    { text: '1. januar 1999', month: 1 },
    { text: '15. februar 1999', month: 2 },
    { text: '10. mars 1999', month: 3 },
    { text: '5. april 1999', month: 4 },
    { text: '20. mai 1999', month: 5 },
    { text: '12. juni 1999', month: 6 },
    { text: '7. juli 1999', month: 7 },
    { text: '25. august 1999', month: 8 },
    { text: '18. september 1999', month: 9 },
    { text: '3. oktober 1999', month: 10 },
    { text: '28. november 1999', month: 11 },
    { text: '22. desember 1999', month: 12 }
  ];

  months.forEach(({ text, month }) => {
    const result = extractDate(text, null, null);
    assert.strictEqual(result.month, month, `Failed for ${text}`);
    assert.strictEqual(result.year, 1999);
  });
});

test('extractDate - Returns null for invalid input', () => {
  assert.strictEqual(extractDate('', null, null), null);
  assert.strictEqual(extractDate(null, null, null), null);
  assert.strictEqual(extractDate('not a date', null, null), null);
  assert.strictEqual(extractDate('random text', null, null), null);
});

test('extractDate - Case insensitive', () => {
  const result1 = extractDate('22. DESEMBER 1999', null, null);
  const result2 = extractDate('22. Desember 1999', null, null);
  const result3 = extractDate('22. desember 1999', null, null);
  
  assert.deepStrictEqual(result1, { year: 1999, month: 12, date: 22 });
  assert.deepStrictEqual(result2, { year: 1999, month: 12, date: 22 });
  assert.deepStrictEqual(result3, { year: 1999, month: 12, date: 22 });
});

