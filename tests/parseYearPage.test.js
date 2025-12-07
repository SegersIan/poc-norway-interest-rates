import { test } from 'node:test';
import assert from 'node:assert';
import { parseYearPage } from '../scripts/1-scan-for-available-reports.js';

test('parseYearPage - Empty HTML returns empty array', () => {
  const result = parseYearPage('<html><body></body></html>', 1999);
  assert.strictEqual(result.length, 0);
});

test('parseYearPage - Finds date and links', () => {
  const html = `
    <html>
      <body>
        <h3>27. januar</h3>
        <ul>
          <li><a href="/press">Pressemelding</a></li>
          <li><a href="/innledning">Innledning til pressekonferanse (bakgrunn for rentebeslutningen)</a></li>
        </ul>
        <h3>3. mars</h3>
        <ul>
          <li><a href="/press2">Pressemelding</a></li>
        </ul>
      </body>
    </html>
  `;
  
  const result = parseYearPage(html, 1999);
  
  assert(result.length >= 2);
  
  const jan27 = result.find(d => d.date === '27' && d.month === '01');
  assert(jan27, 'Should find 27. januar');
  assert.strictEqual(jan27.year.toString(), '1999');
  assert(jan27.links.length >= 2);
  assert(jan27.links.some(l => l.text.includes('Pressemelding')));
  assert(jan27.links.some(l => l.text.includes('Innledning')));
  
  const mar3 = result.find(d => d.date === '03' && d.month === '03');
  assert(mar3, 'Should find 3. mars');
  assert.strictEqual(mar3.year.toString(), '1999');
  assert(mar3.links.length >= 1);
});

test('parseYearPage - Converts relative URLs to absolute', () => {
  const html = `
    <html>
      <body>
        <h3>27. januar</h3>
        <ul>
          <li><a href="/press">Pressemelding</a></li>
        </ul>
      </body>
    </html>
  `;
  
  const result = parseYearPage(html, 1999);
  
  assert(result.length > 0);
  const decision = result[0];
  assert(decision.links.length > 0);
  assert(decision.links[0].url.startsWith('http'));
  assert(decision.links[0].url.includes('norges-bank.no'));
});

test('parseYearPage - Only collects Pressemelding and Innledning links', () => {
  const html = `
    <html>
      <body>
        <h3>27. januar</h3>
        <ul>
          <li><a href="/press">Pressemelding</a></li>
          <li><a href="/other">Other Link</a></li>
          <li><a href="/innledning">Innledning til pressekonferanse (bakgrunn for rentebeslutningen)</a></li>
        </ul>
      </body>
    </html>
  `;
  
  const result = parseYearPage(html, 1999);
  
  assert(result.length > 0);
  const decision = result[0];
  const linkTexts = decision.links.map(l => l.text);
  assert(linkTexts.includes('Pressemelding'));
  assert(linkTexts.includes('Innledning til pressekonferanse (bakgrunn for rentebeslutningen)'));
  assert(!linkTexts.includes('Other Link'));
});

test('parseYearPage - Handles dates without links', () => {
  const html = `
    <html>
      <body>
        <h3>27. januar</h3>
        <p>Some text but no links</p>
      </body>
    </html>
  `;
  
  const result = parseYearPage(html, 1999);
  
  // Should not include decisions without links
  const jan27 = result.find(d => d.date === '27' && d.month === '01');
  assert.strictEqual(jan27, undefined);
});

test('parseYearPage - Removes duplicate dates', () => {
  const html = `
    <html>
      <body>
        <h3>27. januar</h3>
        <ul>
          <li><a href="/press">Pressemelding</a></li>
        </ul>
        <strong>27. januar</strong>
        <ul>
          <li><a href="/press2">Pressemelding</a></li>
        </ul>
      </body>
    </html>
  `;
  
  const result = parseYearPage(html, 1999);
  
  const jan27Decisions = result.filter(d => d.date === '27' && d.month === '01');
  assert.strictEqual(jan27Decisions.length, 1, 'Should have only one decision for 27. januar');
});

