/**
 * Tests for GPP API integration
 */
import { getGppConsentString, getGppConsentFromCookie } from '../../src/core/gpp-api';

// Mock window.__gpp
Object.defineProperty(window, '__gpp', {
  value: jest.fn((command, callback) => {
    if (command === 'getGPPData') {
      callback({
        gppString: 'test-gpp-string',
        applicableSections: [1, 2, 3]
      }, true);
    }
  }),
  writable: true,
  configurable: true
});

// Mock document.cookie
Object.defineProperty(document, 'cookie', {
  value: 'gpp=test-cookie-value; other=value',
  writable: true
});

describe('GPP API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('should get GPP consent string from API', async () => {
    const result = await getGppConsentString();
    expect(result).toBe('test-gpp-string');
    expect(window.__gpp).toHaveBeenCalledWith(
      'getGPPData',
      expect.any(Function)
    );
  });
  
  test('should get GPP consent string from cookie if API fails', async () => {
    // Mock GPP API to fail
    (window.__gpp as jest.Mock).mockImplementationOnce((command, callback) => {
      callback(null, false);
    });
    
    const result = await getGppConsentString();
    expect(result).toBe('test-cookie-value');
  });
  
  test('should get GPP consent string from cookie', () => {
    const result = getGppConsentFromCookie();
    expect(result).toBe('test-cookie-value');
  });
  
  test('should fall back to alternative cookies if gpp cookie not found', () => {
    // Mock document.cookie without gpp cookie
    Object.defineProperty(document, 'cookie', {
      value: 'usprivacy=test-usp-value; other=value',
      writable: true
    });
    
    const result = getGppConsentFromCookie();
    expect(result).toBe('test-usp-value');
    
    // Restore original document.cookie
    Object.defineProperty(document, 'cookie', {
      value: 'gpp=test-cookie-value; other=value',
      writable: true
    });
  });
});
