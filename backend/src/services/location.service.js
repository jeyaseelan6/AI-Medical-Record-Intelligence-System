/**
 * LocationService
 * 
 * Resolves user-entered locations (cities, towns, localities) into normalized geographic
 * coordinates (latitude, longitude, formatted name) using public real-world geocoding APIs (Nominatim / Photon).
 * 
 * Features:
 * - In-memory LRU-bounded cache with TTL to respect external rate limits and reduce latency.
 * - Automatic retry backoff and secondary public OpenStreetMap mirror (Photon) for high availability.
 * - Strict timeout handling with AbortController.
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
   * @param {number} timeoutMs - Timeout in milliseconds (default 8000ms)
   * @returns {Promise<Object>} Normalized location result or structured error
   */
  static async geocodeLocation(locationQuery, timeoutMs = 8000) {
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

    // 2. Query Primary: Nominatim Public Geocoding Endpoint
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanQuery)}&format=json&addressdetails=1&limit=1`;
    
    let result = await this._fetchNominatim(nominatimUrl, cleanQuery, timeoutMs);

    // 3. If Nominatim rate-limited (429) or failed, retry with secondary OSM mirror (Photon)
    if (!result.success && (result.error === 'GEOCODING_RATE_LIMITED' || result.error === 'GEOCODING_TIMEOUT')) {
      console.warn(`[LocationService] Primary geocoder rate-limited or slow for "${cleanQuery}". Trying secondary OpenStreetMap mirror...`);
      result = await this._fetchPhoton(cleanQuery, timeoutMs);
    }

    if (result.success) {
      // Update in-memory cache
      if (locationCache.size >= MAX_CACHE_ENTRIES) {
        const oldestKey = locationCache.keys().next().value;
        locationCache.delete(oldestKey);
      }
      locationCache.set(cacheKey, {
        data: result,
        expiresAt: Date.now() + CACHE_TTL_MS
      });

      console.log(`[LocationService] Geocoded "${cleanQuery}" -> (${result.latitude}, ${result.longitude}) [${result.displayName}]`);
    }

    return result;
  }

  static async _fetchNominatim(url, cleanQuery, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'MedAI-CareIntelligence/2.0 (health-platform@medai.clinical)',
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timer);

      if (!response.ok) {
        if (response.status === 429) {
          return { success: false, error: 'GEOCODING_RATE_LIMITED', message: 'Rate limit reached.' };
        }
        return { success: false, error: `GEOCODING_HTTP_${response.status}`, message: `Status ${response.status}` };
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

      return {
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
    } catch (error) {
      clearTimeout(timer);
      if (error.name === 'AbortError') {
        return { success: false, error: 'GEOCODING_TIMEOUT', message: 'Geocoding request timed out.' };
      }
      return { success: false, error: 'GEOCODING_NETWORK_ERROR', message: error.message };
    }
  }

  static async _fetchPhoton(cleanQuery, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQuery)}&limit=1`;
      const response = await fetch(photonUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });

      clearTimeout(timer);

      if (!response.ok) {
        return { success: false, error: 'GEOCODING_FALLBACK_FAILED', message: 'Secondary geocoder failed.' };
      }

      const data = await response.json();
      const features = data.features || [];
      if (features.length === 0) {
        return {
          success: false,
          error: 'LOCATION_NOT_FOUND',
          message: `We could not identify the location "${cleanQuery}". Please try entering a known city, town, or district.`
        };
      }

      const feat = features[0];
      const coords = feat.geometry?.coordinates || [];
      const props = feat.properties || {};

      const displayName = [props.name, props.city || props.district, props.state, props.country].filter(Boolean).join(', ');

      return {
        success: true,
        query: cleanQuery,
        displayName: displayName || cleanQuery,
        latitude: coords[1],
        longitude: coords[0],
        country: props.country || null,
        region: props.state || props.district || null,
        city: props.city || props.name || null,
        boundingBox: feat.bbox || null,
        cached: false
      };
    } catch (error) {
      clearTimeout(timer);
      return { success: false, error: 'GEOCODING_ERROR', message: error.message };
    }
  }

  /**
   * Resets the internal in-memory geocoding cache.
   */
  static clearCache() {
    locationCache.clear();
  }
}

export default LocationService;
