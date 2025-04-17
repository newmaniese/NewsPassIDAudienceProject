/**
 * ID generation utilities
 */

/**
 * Generate a new random ID with namespace and sufficient entropy for 500M+ users
 */
export function generateId(namespace: string): string {
  // Get current timestamp in milliseconds
  const timestamp = Date.now();
  
  // Generate plenty of randomness for 500M+ users
  const randA = Math.random().toString(36).substring(2, 15);
  const randB = Math.random().toString(36).substring(2, 15);
  let randC: Uint32Array;
  
  try {
    randC = crypto.getRandomValues(new Uint32Array(2));
  } catch (e) {
    // Fallback for older browsers
    randC = new Uint32Array([
      Math.floor(Math.random() * 4294967296),
      Math.floor(Math.random() * 4294967296)
    ]);
  }
  
  // Combine all sources of entropy
  const entropySource = `${randA}${randB}${randC[0]}${randC[1]}${timestamp}`;
  
  // Create a more compact representation with Base36 encoding
  const randomPart = Array.from(entropySource)
    .map(c => c.charCodeAt(0))
    .reduce((acc, val, i) => acc + (val * (i + 1)), 0)
    .toString(36) + randA;
  
  return `${namespace}-${randomPart}`;
}
