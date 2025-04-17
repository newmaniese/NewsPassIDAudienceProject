/**
 * NewsPassID main implementation
 */
import { NewsPassID, NewsPassConfig, IdPayload, SegmentResponse } from './types';
import { getGppConsentString } from './gpp-api';
import { getStoredId, storeId } from '../utils/storage';
import { generateId } from '../utils/random';
import { sendToBackend } from '../utils/network';

class NewsPassIDImpl implements NewsPassID {
  private config: NewsPassConfig;
  private segments: string[] = [];
  private consentString?: string;
  
  constructor(config: NewsPassConfig) {
    this.config = {
      ...config,
      storageKey: config.storageKey || 'newspassid'
    };
    
    console.log(`newspassid initialized with namespace: ${config.namespace}`);
  }

  /**
   * Set or create a NewsPassID
   * @param id Optional ID to use
   * @param publisherSegments Optional array of publisher segment IDs
   * @returns Promise resolving to the ID
   */
  async setID(id?: string, publisherSegments?: string[]): Promise<string> {
    const storedId = getStoredId(this.config.storageKey!);
    const useId = id || storedId || this.generateId();
    
    if (useId !== storedId) {
      storeId(this.config.storageKey!, useId);
    }
    
    // Get consent string
    this.consentString = await getGppConsentString();
    
    // Create payload for backend
    const payload: IdPayload = {
      id: useId,
      timestamp: Date.now(),
      url: window.location.href,
      consentString: this.consentString || '',
      previousId: (id && storedId && id !== storedId) ? storedId : undefined,
      publisherSegments
    };
    
    try {
      const response = await sendToBackend(this.config.lambdaEndpoint, payload);
      if (response && response.segments) {
        this.segments = response.segments;
        this.applySegmentsToPage(response.segments);
        
        // Dispatch event to notify that segments are ready
        window.dispatchEvent(new CustomEvent('newspass_segments_ready', {
          detail: { segments: this.segments }
        }));
      }
    } catch (error) {
      console.error('newspassid: Failed to send ID to backend:', error);
    }
    
    return useId;
  }

  /**
   * Get the current NewsPassID
   */
  getID(): string | null {
    return getStoredId(this.config.storageKey!);
  }

  /**
   * Get segments associated with this ID
   */
  getSegments(): string[] {
    return [...this.segments];
  }

  /**
   * Clear the stored ID
   */
  clearID(): void {
    try {
      localStorage.removeItem(this.config.storageKey!);
      this.segments = [];
      console.log('newspassid: ID cleared successfully');
    } catch (e) {
      console.warn('newspassid: Unable to remove from localStorage:', e);
    }
  }

  /**
   * Generate a new random ID
   */
  private generateId(): string {
    return generateId(this.config.namespace);
  }

  /**
   * Apply segments as key-values for ad targeting
   */
  private applySegmentsToPage(segments: string[]): void {
    // Global data layer for easy access
    window.newspass_segments = segments;
    
    // For Google Ad Manager (GAM)
    if (window.googletag && window.googletag.pubads) {
      // Set all segments as a single array to a single key
      window.googletag.pubads().setTargeting('npid_segments', segments);
      
      // Refresh ads to apply new targeting
      window.googletag.pubads().refresh();
    }
    
    // For Prebid.js
    if (window.pbjs) {
      try {
        // Set targeting for prebid
        window.pbjs.setTargetingForGPTAsync({
          npid_segments: segments
        });
      } catch (e) {
        console.warn('newspassid: Error setting Prebid targeting:', e);
      }
    }
    
    // Add data attribute to the HTML with all segments
    const body = document.querySelector('body');
    if (body) {
      // Set a single data attribute with JSON string of all segments
      (body as HTMLElement).dataset.newspass_segments = JSON.stringify(segments);
    }
  }
}

/**
 * Factory function to create a NewsPassID instance
 */
export function createNewsPassID(config: NewsPassConfig): NewsPassID {
  return new NewsPassIDImpl(config);
}

export default {
  createNewsPassID
};
