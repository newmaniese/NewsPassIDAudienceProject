/**
 * NewsPassID Build Script
 * 
 * This script builds the NewsPassID library and generates all distribution files.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

console.log(`${colors.bright}${colors.blue}Building NewsPassID...${colors.reset}\n`);

try {
  // Clean up previous build
  console.log(`${colors.yellow}Cleaning up previous build...${colors.reset}`);
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  fs.mkdirSync('dist', { recursive: true });
  
  // Run TypeScript compiler
  console.log(`${colors.yellow}Compiling TypeScript...${colors.reset}`);
  execSync('npx tsc', { stdio: 'inherit' });
  
  // Run webpack
  console.log(`${colors.yellow}Bundling with webpack...${colors.reset}`);
  execSync('npx webpack', { stdio: 'inherit' });
  
  // Minify the bundles
  console.log(`${colors.yellow}Minifying bundles...${colors.reset}`);
  
  // Main library
  execSync('npx terser dist/newspassid.js -o dist/newspassid.min.js --compress --mangle', { 
    stdio: 'inherit'
  });
  
  // Async loader (already minified by webpack but ensure name consistency)
  fs.copyFileSync('dist/newspassid-async.js', 'dist/newspassid-async.min.js');
  
  // Generate file sizes for reporting
  const mainSize = (fs.statSync('dist/newspassid.js').size / 1024).toFixed(1);
  const mainMinSize = (fs.statSync('dist/newspassid.min.js').size / 1024).toFixed(1);
  const asyncSize = (fs.statSync('dist/newspassid-async.js').size / 1024).toFixed(1);
  
  console.log(`\n${colors.bright}${colors.green}Build completed successfully!${colors.reset}`);
  console.log(`\nOutput files:`);
  console.log(`- dist/newspassid.js (${mainSize}KB)`);
  console.log(`- dist/newspassid.min.js (${mainMinSize}KB)`);
  console.log(`- dist/newspassid-async.js (${asyncSize}KB)`);
  console.log(`- dist/newspassid-async.min.js (${asyncSize}KB)`);
  
} catch (error) {
  console.error(`${colors.red}Build failed:${colors.reset}`, error);
  process.exit(1);
}
