/**
 * Segment handling functions
 */
const fs = require('fs').promises;

/**
 * Get user segments from the segments.json file (written by Snowflake)
 */
async function getUserSegmentsFromFile(id, url, segmentsFile) {
  try {
    // Try to read the segments file - this will be written by Snowflake
    let segmentData;
    
    try {
      const fileContent = await fs.readFile(segmentsFile, 'utf8');
      segmentData = JSON.parse(fileContent);
    } catch (error) {
      console.warn(`Could not read segments file ${segmentsFile}:`, error);
      // Return default segments
      return getDefaultSegments(url);
    }
    
    // Check if we have segments for this ID
    if (segmentData[id]) {
      return segmentData[id];
    }
    
    // Otherwise use default segments based on URL
    return getDefaultSegments(url);
  } catch (error) {
    console.error('Error getting user segments from file:', error);
    return getDefaultSegments(url);
  }
}

/**
 * Generate default segments based on URL patterns
 * Used as fallback when no segments are found in the file
 */
function getDefaultSegments(url) {
  // Generate random segment IDs
  // These are opaque identifiers, not revealing any PII
  const segmentCount = Math.floor(Math.random() * 3) + 1; // 1-3 segments
  const segments = [];
  
  for (let i = 0; i < segmentCount; i++) {
    // Generate a random segment ID
    segments.push(`seg_${Math.random().toString(36).substring(2, 15)}`);
  }
  
  return segments;
}

module.exports = {
  getUserSegmentsFromFile,
  getDefaultSegments
};
