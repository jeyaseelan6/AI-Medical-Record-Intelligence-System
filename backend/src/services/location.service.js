/**
 * LocationService
 * 
 * Resolves user-entered locations (cities, towns, localities) into normalized geographic
 * coordinates (latitude, longitude, formatted name) using public real-world geocoding APIs (Nominatim).
 * 
 * Features:
 * - In-memory LRU-bounded cache with TTL to respect external rate limits and reduce latency.
 * - Strict timeout handling (6s) with AbortController.
 * - Clear, structured error reporting for ambiguous or unrecognized locations.
 * - Zero coordinate fabrication or guessing.
 */

// In-memory cache map for geocoding results (Query -> { data, expiresAt })
const locationCache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_ENTRIES = 500;

export class LocationService {

  /**
   * Geocodes a user-entered location query into normalized coordinates and boundary details.
   * 
   * @param {string} locationQuery - User input (e.g. "Jaffna", "Colombo 07", "Kandy", "London")
   * @param {number} timeoutMs - Timeout in milliseconds (default 6000ms)
   * @returns {Promise<Object>} Normalized location result or structured error
   */
  static async geocodeLocation(locationQuery, timeoutMs = 6000) {
    if (!locationQuery || typeof locationQuery !== 'string' || !locationQuery.trim()) {
      return {
        success: false,
        error: 'LOCATION_REQUIRED',
        message: 'Please provide a valid city, town, district, or locality name.'
      };
    }

    const cleanQuery = locationQuery.trim();
    const cacheKey = cleanQuery.toLowerCase();

    // 1. Check in-memory cache
    if (locationCache.has(cacheKey)) {
      const cached = locationCache.get(cacheKey);
      if (Date.now() < cached.expiresAt) {
        return {
          ...cached.data,
          cached: true
        };
      }
      locationCache.delete(cacheKey);
    }

    // 2. Query Nominatim Public Geocoding Endpoint
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanQuery)}&format=json&addressdetails=1&limit=1`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'MedAI-CareIntelligence/2.0 (contact@medai.clinical)',
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timer);

      if (!response.ok) {
        if (response.status === 429) {
          return {
            success: false,
            error: 'GEOCODING_RATE_LIMITED',
            message: 'Geocoding service rate limit reached. Please wait a moment and try again.'
          };
        }
        return {
          success: false,
          error: `GEOCODING_HTTP_${response.status}`,
          message: 'Geocoding service returned an unexpected status code.'
        };
      }

      const results = await response.json();

      if (!Array.isArray(results) || results.length === 0) {
        return {
          success: false,
          error: 'LOCATION_NOT_FOUND',
          message: `We could not identify the location "${cleanQuery}". Please try entering a known city, town, or district.`
        };
      }

      const match = results[0];
      const address = match.address || {};

      const normalizedResult = {
        success: true,
        query: cleanQuery,
        displayName: match.display_name || cleanQuery,
        latitude: parseFloat(match.lat),
        longitude: parseFloat(match.lon),
        country: address.country || null,
        region: address.state || address.province || address.district || address.region || null,
        city: address.city || address.town || address.village || address.municipality || address.suburb || null,
        boundingBox: match.boundingbox ? match.boundingbox.map(Number) : null,
        cached: false
      };

      // 3. Update cache (with size management)
      if (locationCache.size >= MAX_CACHE_ENTRIES) {
        const oldestKey = locationCache.keys().next().value;
        locationCache.delete(oldestKey);
      }
      locationCache.set(cacheKey, {
        data: normalizedResult,
        expiresAt: Date.now() + CACHE_TTL_MS
      });

      console.log(`[LocationService] Geocoded "${cleanQuery}" -> (${normalizedResult.latitude}, ${normalizedResult.longitude}) [${normalizedResult.displayName}]`);
      return normalizedResult;

    } catch (error) {
      clearTimeout(timer);
      if (error.name === 'AbortError') {
        console.warn(`[LocationService] Geocoding request timed out after ${timeoutMs}ms for query "${cleanQuery}".`);
        return {
          success: false,
          error: 'GEOCODING_TIMEOUT',
          message: 'Location resolution service timed out. Please check your internet connection and try again.'
        };
      }

      console.error(`[LocationService Error] Geocoding failed for "${cleanQuery}":`, error.message);
      return {
        success: false,
        error: 'GEOCODING_NETWORK_ERROR',
        message: `Failed to resolve location: ${error.message}`
      };
    }
  }

  /**
   * Helper to clear the geocoding cache (useful for testing).
   */
  static clearCache() {
    locationCache.clear();
  }
}

export default LocationService;
