/**
 * Tests for NewsPassID
 */
import { createNewsPassID } from '../../src/core/newspassid';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock fetch
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: jest.fn().mockResolvedValue({
    id: 'test-id',
    segments: ['segment1', 'segment2'],
    success: true
  })
});

describe('NewsPassID', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    localStorageMock.clear();
    
    // Mock window objects
    Object.defineProperty(window, 'googletag', {
      value: {
        pubads: jest.fn().mockReturnValue({
          setTargeting: jest.fn(),
          refresh: jest.fn()
        })
      },
      writable: true
    });
    
    Object.defineProperty(window, 'pbjs', {
      value: {
        setTargetingForGPTAsync: jest.fn()
      },
      writable: true
    });
    
    // Mock document
    document.body = document.createElement('body');
    
    // Mock event dispatcher
    window.dispatchEvent = jest.fn();
  });
  
  test('should create a new ID when not provided', async () => {
    const newspassId = createNewsPassID({
      namespace: 'test',
      lambdaEndpoint: 'https://api.example.com/newspassid'
    });
    
    const id = await newspassId.getID();
    expect(id).toBeNull();
    
    const newId = await newspassId.setID();
    expect(newId).toBeDefined();
    expect(newId).toContain('test-');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('newspassid', newId);
  });
  
  test('should use provided ID', async () => {
    const newspassId = createNewsPassID({
      namespace: 'test',
      lambdaEndpoint: 'https://api.example.com/newspassid'
    });
    
    const customId = 'test-custom123';
    const id = await newspassId.setID(customId);
    
    expect(id).toBe(customId);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('newspassid', customId);
  });
  
  test('should return segments', async () => {
    const newspassId = createNewsPassID({
      namespace: 'test',
      lambdaEndpoint: 'https://api.example.com/newspassid'
    });
    
    await newspassId.setID('test-id');
    const segments = newspassId.getSegments();
    
    expect(segments).toEqual(['segment1', 'segment2']);
  });
  
  test('should clear ID', () => {
    const newspassId = createNewsPassID({
      namespace: 'test',
      lambdaEndpoint: 'https://api.example.com/newspassid'
    });
    
    newspassId.clearID();
    
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('newspassid');
  });
});
