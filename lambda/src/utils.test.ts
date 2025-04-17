import { getCorsHeaders, errorResponse, isValidId, getNamespaceFromId } from './utils';

describe('Utils', () => {
  describe('getCorsHeaders', () => {
    it('should return CORS headers with origin from event', () => {
      const event = {
        headers: {
          origin: 'https://example.com'
        }
      };
      const headers = getCorsHeaders(event as any);
      expect(headers['Access-Control-Allow-Origin']).toBe('https://example.com');
      expect(headers['Access-Control-Allow-Methods']).toBe('POST,OPTIONS');
    });

    it('should use wildcard origin if none provided', () => {
      const event = { headers: {} };
      const headers = getCorsHeaders(event as any);
      expect(headers['Access-Control-Allow-Origin']).toBe('*');
    });
  });

  describe('errorResponse', () => {
    it('should create an error response with the correct structure', () => {
      const response = errorResponse(400, 'Bad Request');
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body)).toEqual({
        success: false,
        error: 'Bad Request'
      });
    });
  });

  describe('isValidId', () => {
    it('should validate correct ID format', () => {
      expect(isValidId('publisher-123')).toBe(true);
    });

    it('should reject invalid ID formats', () => {
      expect(isValidId('')).toBe(false);
      expect(isValidId('publisher')).toBe(false);
      expect(isValidId('-123')).toBe(false);
      expect(isValidId('publisher-')).toBe(false);
    });
  });

  describe('getNamespaceFromId', () => {
    it('should extract namespace from valid ID', () => {
      expect(getNamespaceFromId('publisher-123')).toBe('publisher');
    });

    it('should handle malformed IDs', () => {
      expect(getNamespaceFromId('publisher')).toBe('publisher');
    });
  });
}); 