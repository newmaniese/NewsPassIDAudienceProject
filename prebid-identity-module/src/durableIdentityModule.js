import { submodule } from '../src/hook.js';
import { logInfo, logError, generateUUID, getStorageManager } from '../src/utils.js';

const MODULE_NAME = 'durableIdentityModule';
const STORAGE_KEY = 'pub_durable_id'; // Local storage key
const COOKIE_EXPIRATION_DAYS = 365 * 5; // 5-year expiration
const storage = getStorageManager({ moduleName: MODULE_NAME });

export const durableIdentityModule = {
  name: MODULE_NAME,

  /**
   * Fetches the user ID for Prebid.
   * @param {Object} config - The configuration object provided in the userSync module.
   * @param {string} storedId - A previously stored ID (if available).
   * @returns {Object} ID object with callback function
   */
  getId(config, storedId) {
    let userId = storedId || storage.getDataFromLocalStorage(STORAGE_KEY);

    if (!userId) {
      userId = generateUUID(); // Generate a new durable ID
      storage.setDataInLocalStorage(STORAGE_KEY, userId);
      storage.setCookie(STORAGE_KEY, userId, COOKIE_EXPIRATION_DAYS);
      logInfo(`${MODULE_NAME}: Generated new user ID: ${userId}`);
    } else {
      logInfo(`${MODULE_NAME}: Using existing user ID: ${userId}`);
    }

    return { id: userId };
  },

  /**
   * Extends the existing user ID.
   * @param {Object} config - Configuration object.
   * @param {string} storedId - Previously stored user ID.
   * @returns {Object|null} Extended ID object.
   */
  extendId(config, storedId) {
    if (!storedId) return null;

    // Refresh expiration
    storage.setDataInLocalStorage(STORAGE_KEY, storedId);
    storage.setCookie(STORAGE_KEY, storedId, COOKIE_EXPIRATION_DAYS);
    logInfo(`${MODULE_NAME}: Extended user ID expiration.`);
    
    return { id: storedId };
  }
};

// Register the module with Prebid
submodule('userId', durableIdentityModule);
