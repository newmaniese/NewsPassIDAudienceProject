/**
 * Advanced tests for NewsPassID
 */
import { createNewsPassID } from '../../src/core/newspassid';
import { getGppConsentString } from '../../src/core/gpp-api';

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
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock the DOM environment
const mockMetaElement = {
  setAttribute: jest.fn(),
  remove: jest.fn()
};

const mockBodyElement = {
  dataset: {},
  getAttribute: jest.fn(),
  setAttribute: jest.fn()
};

const mockDocument = {
  createElement: jest.fn().mockReturnValue(mockMetaElement),
  querySelector: jest.fn().mockReturnValue(mockBodyElement),
  head: {
    appendChild: jest.fn(),
    querySelectorAll: jest.fn().mockReturnValue([])
  },
  cookie: '',
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};

const mockWindow = {
  document: mockDocument,
  dispatchEvent: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  location: {
    href: 'https://example.com'
  },
  googletag: {
    pubads: jest.fn().mockReturnValue({
      setTargeting: jest.fn(),
      refresh: jest.fn()
    })
  },
  newspass_segments: [] as string[]
};

// Mock the global window and document
Object.defineProperty(global, 'window', {
  value: {
    ...mockWindow,
    document: {
      ...mockDocument,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    }
  } as unknown as Window & typeof globalThis,
  writable: true,
  configurable: true
});

Object.defineProperty(global, 'document', {
  value: {
    ...mockDocument,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  } as unknown as Document,
  writable: true,
  configurable: true
});

// Mock CustomEvent constructor
class MockCustomEvent<T = unknown> {
  readonly type: string;
  readonly detail: T;

  constructor(type: string, eventInitDict?: CustomEventInit<T>) {
    this.type = type;
    this.detail = eventInitDict?.detail as T;
  }
}

global.CustomEvent = MockCustomEvent as unknown as typeof CustomEvent;

// Mock the GPP API
jest.mock('../../src/core/gpp-api', () => ({
  getGppConsentString: jest.fn().mockResolvedValue('mock-consent-string')
}));

describe('NewsPassID Advanced Features', () => {
  let newspassId: ReturnType<typeof createNewsPassID>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    localStorageMock.clear();
    mockFetch.mockReset();
    
    // Create a new instance for each test
    newspassId = createNewsPassID({
      namespace: 'test',
      lambdaEndpoint: 'https://api.example.com/newspassid'
    });
  });

  it('should handle custom publisher segments', async () => {
    const customSegments = ['publisher-segment-1', 'publisher-segment-2'];
    
    // Mock successful backend response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ segments: customSegments, success: true })
    });

    const id = await newspassId.setID('test-id', customSegments);
    
    expect(id).toBe('test-id');
    expect(newspassId.getSegments()).toEqual(customSegments);
  });

  it('should handle empty custom segments', async () => {
    // Mock successful backend response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ segments: [], success: true })
    });

    const id = await newspassId.setID('test-id', []);
    
    expect(id).toBe('test-id');
    expect(newspassId.getSegments()).toEqual([]);
  });

  it('should inject segment meta tags when enabled', async () => {
    const segments = ['segment1', 'segment2'];
    
    // Mock successful backend response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ segments, success: true })
    });

    await newspassId.setID('test-id', segments);
    
    // Verify meta tag creation and attributes
    expect(mockDocument.createElement).toHaveBeenCalledWith('meta');
    expect(mockMetaElement.setAttribute).toHaveBeenCalledWith('name', expect.stringMatching(/^newspass_segment_/));
    expect(mockMetaElement.setAttribute).toHaveBeenCalledWith('content', expect.any(String));
    expect(mockDocument.head.appendChild).toHaveBeenCalledWith(mockMetaElement);
  });

  it('should handle segment meta tag injection errors', async () => {
    mockDocument.createElement.mockImplementationOnce(() => {
      throw new Error('Failed to create element');
    });

    // Mock successful backend response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ segments: ['segment1'], success: true })
    });

    const segments = ['segment1'];
    await newspassId.setID('test-id', segments);
    
    // Should not throw, just log error
    newspassId.getSegments();
  });

  it('should dispatch events for ID changes', async () => {
    // Mock successful backend response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ segments: [], success: true })
    });

    await newspassId.setID('test-id');
    
    // Verify event dispatch
    expect(mockWindow.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'newspassid:change',
        detail: expect.objectContaining({
          id: 'test-id'
        })
      })
    );
  });

  it('should handle network timeouts', async () => {
    // Mock a network timeout
    mockFetch.mockImplementationOnce(() => 
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), 100)
      )
    );

    const id = await newspassId.setID();
    expect(id).toBeDefined();
  });

  it('should handle network errors gracefully', async () => {
    // Mock a network error
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const id = await newspassId.setID();
    expect(id).toBeDefined();
  });

  it('should handle GPP consent errors', async () => {
    // Mock GPP consent error
    (getGppConsentString as jest.Mock).mockRejectedValueOnce(new Error('GPP Error'));

    // Mock successful backend response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ segments: [], success: true })
    });

    const id = await newspassId.setID();
    expect(id).toBeDefined();
    expect(getGppConsentString).toHaveBeenCalled();
  });
}); 