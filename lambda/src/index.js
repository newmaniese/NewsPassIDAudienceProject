/**
 * NewsPassID Lambda Handler
 * 
 * This Lambda function handles the NewsPassID API requests. It processes ID data,
 * manages segments, and stores information in S3 with a structured file hierarchy.
 * 
 * File Structure:
 * - Main ID data: publisher/domain/id/timestamp.csv
 * - Segments data: publisher/domain/id/segments.csv
 * - ID mappings: publisher/mappings/previousId.csv
 * 
 * Environment Variables:
 * - STORAGE_BUCKET: S3 bucket name for storing data
 * - ID_FOLDER: Root folder for all NewsPassID data (default: 'newspassid')
 * 
 * @module NewsPassIDLambda
 */

const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const fs = require('fs').promises;
const utils = require('./utils');

// Configure from environment variables
const BUCKET_NAME = process.env.STORAGE_BUCKET;
const ID_FOLDER = process.env.ID_FOLDER || 'newspassid';

/**
 * Extracts and normalizes the domain from a URL.
 * Removes 'www.' prefix and handles invalid URLs gracefully.
 * 
 * @param {string} url - The URL to extract domain from
 * @returns {string} Normalized domain name or 'unknown' if URL is invalid
 * 
 * @example
 * getDomainFromUrl('https://www.example.com/page') // returns 'example.com'
 * getDomainFromUrl('invalid-url') // returns 'unknown'
 */
function getDomainFromUrl(url) {
  try {
    const domain = new URL(url).hostname;
    return domain.replace(/^www\./, '');
  } catch (e) {
    return 'unknown';
  }
}

/**
 * Reads and filters segments from a CSV file based on expiration timestamps.
 * The segments file is expected to be in the format:
 * segments,expire_timestamp
 * segment1,1234567890000
 * segment2,1234567891000
 * 
 * @param {string} namespace - The publisher namespace
 * @param {string} domain - The domain name
 * @param {string} id - The NewsPassID
 * @returns {Promise<string[]>} Array of valid (non-expired) segments
 * 
 * @example
 * // Returns ['segment1'] if segment2 has expired
 * await getValidSegments('publisher1', 'example.com', 'id123')
 */
async function getValidSegments(namespace, domain, id) {
  try {
    const segmentsKey = `${ID_FOLDER}/${namespace}/${domain}/${id}/segments.csv`;
    
    // Try to get the segments file
    const segmentsData = await s3.getObject({
      Bucket: BUCKET_NAME,
      Key: segmentsKey
    }).promise();
    
    // Parse CSV content
    const csvContent = segmentsData.Body.toString('utf-8');
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',');
    
    // Find indices of required columns
    const segmentIndex = headers.indexOf('segments');
    const expireIndex = headers.indexOf('expire_timestamp');
    
    if (segmentIndex === -1 || expireIndex === -1) {
      console.warn('Missing required columns in segments file');
      return [];
    }
    
    // Filter valid segments
    const currentTime = Date.now();
    const validSegments = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].split(',');
      const expireTimestamp = parseInt(values[expireIndex], 10);
      
      if (!isNaN(expireTimestamp) && expireTimestamp > currentTime) {
        validSegments.push(values[segmentIndex]);
      }
    }
    
    return validSegments;
  } catch (error) {
    if (error.code === 'NoSuchKey') {
      // File doesn't exist, return empty array
      return [];
    }
    console.error('Error reading segments:', error);
    return [];
  }
}

/**
 * Main Lambda handler for the NewsPassID API.
 * 
 * Expected Request Body:
 * {
 *   id: string,          // Required: NewsPassID
 *   timestamp: number,   // Required: Unix timestamp
 *   url: string,         // Required: Current page URL
 *   consentString: string,  // Required: User consent string
 *   previousId?: string,  // Optional: Previous NewsPassID for mapping
 *   publisherSegments?: string[]  // Optional: Custom publisher segment IDs
 * }
 * 
 * Response:
 * {
 *   statusCode: number,
 *   headers: object,
 *   body: {
 *     success: boolean,
 *     id: string,
 *     segments: string[]
 *   }
 * }
 * 
 * @param {Object} event - API Gateway event
 * @param {Object} event.body - Request body as JSON string
 * @param {Object} event.requestContext - Request context including identity
 * @returns {Promise<Object>} API Gateway response
 * 
 * @example
 * // Example event
 * {
 *   body: '{"id":"id123","timestamp":1234567890,"url":"https://example.com","consentString":"consent123","publisherSegments":["seg1","seg2"]}'
 * }
 */
exports.handler = async (event) => {
  try {
    // Parse the request body from API Gateway
    const body = JSON.parse(event.body);
    
    // Validate required fields
    if (!body.id || !body.timestamp || !body.url || !body.consentString) {
      return utils.errorResponse(400, 'Missing required fields. All requests must include id, timestamp, url, and consentString.');
    }
    
    // Validate ID format
    if (!utils.isValidId(body.id)) {
      return utils.errorResponse(400, 'Invalid ID format');
    }
    
    // Get namespace and domain
    const namespace = utils.getNamespaceFromId(body.id);
    const domain = getDomainFromUrl(body.url);
    
    // Get valid segments
    const validSegments = await getValidSegments(namespace, domain, body.id);
    
    // Create file key with publisher/domain structure
    const fileKey = `${ID_FOLDER}/${namespace}/${domain}/${body.id}/${body.timestamp}.csv`;
    
    // Prepare CSV content
    const csvContent = [
      // Headers
      'id,timestamp,url,consentString,previousId,segments,publisherSegments',
      // Data row
      [
        body.id,
        body.timestamp,
        body.url,
        body.consentString,
        body.previousId || '',
        validSegments.join('|'),
        (body.publisherSegments || []).join('|')
      ].map(field => `"${field}"`).join(',')
    ].join('\n');
    
    // Upload to S3
    await s3.putObject({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      Body: csvContent,
      ContentType: 'text/csv'
    }).promise();
    
    // If there's a previousId, create a mapping file for lookups
    if (body.previousId) {
      const mappingKey = `${ID_FOLDER}/${namespace}/mappings/${body.previousId}.csv`;
      const mappingContent = [
        'oldId,newId,timestamp',
        `"${body.previousId}","${body.id}",${body.timestamp}`
      ].join('\n');
      
      await s3.putObject({
        Bucket: BUCKET_NAME,
        Key: mappingKey,
        Body: mappingContent,
        ContentType: 'text/csv'
      }).promise();
    }
    
    // Return successful response with valid segments
    return {
      statusCode: 200,
      headers: utils.getCorsHeaders(event),
      body: JSON.stringify({ 
        success: true,
        id: body.id,
        segments: validSegments
      })
    };
  } catch (error) {
    console.error('Error processing NewsPassID:', error);
    return utils.errorResponse(500, 'Internal server error');
  }
};
