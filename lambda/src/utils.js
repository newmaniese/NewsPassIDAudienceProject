/**
 * Utility functions for newspassid Lambda
 */

/**
 * Get CORS headers for the response
 */
exports.getCorsHeaders = (event) => {
  const origin = event.headers?.origin || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Credentials': 'true'
  };
};

/**
 * Create an error response
 */
exports.errorResponse = (statusCode, message) => {
  return {
    statusCode,
    headers: exports.getCorsHeaders({}),
    body: JSON.stringify({
      success: false,
      error: message
    })
  };
};

/**
 * Validate ID format
 */
exports.isValidId = (id) => {
  if (!id || typeof id !== 'string') return false;
  // ID should be in format: namespace-id
  const parts = id.split('-');
  return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0;
};

/**
 * Get namespace from ID
 */
exports.getNamespaceFromId = (id) => {
  return id.split('-')[0];
};

module.exports = {
  getNamespaceFromId,
  isValidId,
  errorResponse,
  getCorsHeaders
};
