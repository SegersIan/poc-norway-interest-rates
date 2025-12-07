#!/usr/bin/env node

/**
 * Test runner script that runs all tests in the tests directory
 * Uses Node.js built-in test runner
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const testsDir = join(__dirname, 'tests');

// Find all test files
import { readdir } from 'fs/promises';

async function runTests() {
  try {
    const files = await readdir(testsDir);
    const testFiles = files.filter(f => f.endsWith('.test.js'));
    
    if (testFiles.length === 0) {
      console.log('No test files found');
      process.exit(1);
    }
    
    console.log(`Found ${testFiles.length} test file(s):`);
    testFiles.forEach(f => console.log(`  - ${f}`));
    console.log('');
    
    // Run each test file
    for (const testFile of testFiles) {
      const testPath = join(testsDir, testFile);
      console.log(`Running ${testFile}...`);
      
      await new Promise((resolve, reject) => {
        const proc = spawn('node', ['--test', testPath], {
          stdio: 'inherit',
          shell: false
        });
        
        proc.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Test ${testFile} failed with code ${code}`));
          }
        });
        
        proc.on('error', reject);
      });
      
      console.log(`✓ ${testFile} passed\n`);
    }
    
    console.log('All tests passed!');
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  }
}

runTests();

