import { OsmProviderAdapter } from './adapters/osm-provider.adapter.js';
import { GooglePlacesAdapter } from './adapters/google-places.adapter.js';
import { LocationService } from './location.service.js';

// In-memory cache for provider search queries (Key -> { data, expiresAt })
const providerCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_CACHE_SIZE = 300;

/**
 * ProviderSearchService
 * 
 * Core provider discovery layer that queries real public healthcare directories
 * through pluggable adapters (OpenStreetMap / Google Places).
 * 
 * Privacy & Security Guarantees:
 * - Never sends patient identifiers, clinical summaries, or medical files to external APIs.
 * - Only sends geographic coordinates, search radius, and care category.
 * - All external API credentials remain strictly server-side.
 * - Never fabricates fake doctors, clinics, or ratings.
 */
export class ProviderSearchService {

  /**
   * Selects the appropriate active provider adapter based on system configuration.
   * Defaults to OpenStreetMap (free, open, global) and automatically upgrades to
   * Google Places if GOOGLE_PLACES_API_KEY is configured.
   * 
   * @returns {Class} Adapter class implementing searchProviders
   */
  static getActiveAdapter() {
    if (GooglePlacesAdapter.isConfigured()) {
      return GooglePlacesAdapter;
    }
    return OsmProviderAdapter;
  }

  /**
   * Searches for real healthcare providers near the specified geographic coordinates.
   * 
   * @param {Object} params
   * @param {number} params.latitude - Search origin latitude
   * @param {number} params.longitude - Search origin longitude
   * @param {number} params.radiusKm - Search radius in kilometers (default: 25km)
   * @param {string} params.specialty - Target medical specialty (e.g., 'Cardiology')
   * @param {string} params.careType - Target care category ('primary_care', 'specialist', 'pharmacist', 'urgent_care')
   * @param {number} params.timeoutMs - Timeout in milliseconds
   * @returns {Promise<Object>} Object with list of normalized, real provider records
   */
  static async searchProviders({ latitude, longitude, radiusKm = 25, specialty = null, careType = null, timeoutMs = 10000 }) {
    if (latitude == null || longitude == null || isNaN(latitude) || isNaN(longitude)) {
      return {
        success: false,
        error: 'INVALID_COORDINATES',
        message: 'Valid latitude and longitude coordinates are required.',
        count: 0,
        providers: []
      };
    }

    const latNum = parseFloat(latitude);
    const lonNum = parseFloat(longitude);
    const radNum = Math.max(1, Math.min(100, parseFloat(radiusKm) || 25));

    // Cache key incorporates location grid (~1km granularity) and care type
    const cacheKey = `${latNum.toFixed(2)}_${lonNum.toFixed(2)}_${radNum}_${careType || 'all'}`;

    // 1. Check in-memory cache
    if (providerCache.has(cacheKey)) {
      const cached = providerCache.get(cacheKey);
      if (Date.now() < cached.expiresAt) {
        return {
          ...cached.data,
          cached: true
        };
      }
      providerCache.delete(cacheKey);
    }

    // 2. Query active adapter
    const adapter = this.getActiveAdapter();
    console.log(`[ProviderSearchService] Executing search via ${adapter.sourceName} at (${latNum}, ${lonNum}) radius: ${radNum}km, careType: ${careType || 'all'}...`);

    try {
      const result = await adapter.searchProviders({
        latitude: latNum,
        longitude: lonNum,
        radiusKm: radNum,
        specialty,
        careType,
        timeoutMs
      });

      if (!result.success) {
        return result;
      }

      const responsePayload = {
        success: true,
        count: result.providers ? result.providers.length : 0,
        providers: result.providers || [],
        source: result.source || adapter.sourceName,
        sourceAttribution: result.sourceAttribution || 'Public Healthcare Directory',
        searchCoordinates: { latitude: latNum, longitude: lonNum },
        searchRadiusKm: radNum,
        cached: false
      };

      // 3. Cache successful results
      if (providerCache.size >= MAX_CACHE_SIZE) {
        const oldestKey = providerCache.keys().next().value;
        providerCache.delete(oldestKey);
      }
      providerCache.set(cacheKey, {
        data: responsePayload,
        expiresAt: Date.now() + CACHE_TTL_MS
      });

      return responsePayload;

    } catch (error) {
      console.error('[ProviderSearchService Error] Search failed:', error.message);
      return {
        success: false,
        error: 'PROVIDER_SEARCH_ERROR',
        message: `Provider retrieval encountered an unexpected error: ${error.message}`,
        count: 0,
        providers: []
      };
    }
  }

  /**
   * Combined high-level method: Takes a raw user location query string (e.g. "Jaffna"),
   * geocodes it, and executes the real provider discovery search.
   * 
   * @param {string} locationQuery - User input location string
   * @param {Object} options - Search options (radiusKm, specialty, careType)
   * @returns {Promise<Object>} Combined location metadata and provider search results
   */
  static async searchByLocationQuery(locationQuery, options = {}) {
    // 1. Geocode location query
    const geocodeRes = await LocationService.geocodeLocation(locationQuery);
    if (!geocodeRes.success) {
      return {
        success: false,
        error: geocodeRes.error,
        message: geocodeRes.message,
        location: null,
        count: 0,
        providers: []
      };
    }

    // 2. Execute provider search using geocoded coordinates
    const searchRes = await this.searchProviders({
      latitude: geocodeRes.latitude,
      longitude: geocodeRes.longitude,
      radiusKm: options.radiusKm || 25,
      specialty: options.specialty || null,
      careType: options.careType || null,
      timeoutMs: options.timeoutMs || 10000
    });

    return {
      ...searchRes,
      location: {
        query: locationQuery,
        displayName: geocodeRes.displayName,
        latitude: geocodeRes.latitude,
        longitude: geocodeRes.longitude,
        country: geocodeRes.country,
        region: geocodeRes.region,
        city: geocodeRes.city
      }
    };
  }

  /**
   * Clears the in-memory provider cache.
   */
  static clearCache() {
    providerCache.clear();
  }
}

export default ProviderSearchService;
