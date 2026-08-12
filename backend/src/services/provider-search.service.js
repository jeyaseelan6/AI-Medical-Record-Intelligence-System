import { OsmProviderAdapter } from './adapters/osm-provider.adapter.js';
import { GooglePlacesAdapter } from './adapters/google-places.adapter.js';
import { LocationService } from './location.service.js';
import { ProviderMerger } from '../utils/provider-merger.js';

// In-memory cache for provider search queries (Key -> { data, expiresAt })
const providerCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_CACHE_SIZE = 300;

/**
 * ProviderSearchService
 * 
 * Core provider discovery layer that aggregates real public healthcare directories
 * (OpenStreetMap, Google Places API, Sri Lanka Ministry of Health MFL)
 * into a single unified, enriched provider collection.
 * 
 * Privacy & Security Guarantees:
 * - Never sends patient identifiers, clinical summaries, or medical files to external APIs.
 * - Only sends geographic coordinates, search radius, and care category.
 * - All external API credentials remain strictly server-side.
 * - Never fabricates fake doctors, clinics, or ratings.
 */
export class ProviderSearchService {

  /**
   * Searches for real healthcare providers near the specified geographic coordinates,
   * aggregating data across OpenStreetMap, Google Places API (if configured), and Ministry of Health MFL.
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

    // Cache key incorporates location grid (~1km granularity), specialty, and care type
    const cacheKey = `${latNum.toFixed(2)}_${lonNum.toFixed(2)}_${radNum}_${careType || 'all'}_${specialty || 'none'}`;

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

    console.log(`[ProviderSearchService] Discovering providers at (${latNum}, ${lonNum}) radius: ${radNum}km, careType: ${careType || 'all'}, specialty: ${specialty || 'none'}...`);

    try {
      // 2. Discover baseline physical facilities from OpenStreetMap
      const osmPromise = OsmProviderAdapter.searchProviders({
        latitude: latNum,
        longitude: lonNum,
        radiusKm: radNum,
        specialty,
        careType,
        timeoutMs
      });

      // 3. Concurrently discover Google Places providers if API key is configured
      let googlePromise = Promise.resolve({ success: false, providers: [] });
      if (GooglePlacesAdapter.isConfigured()) {
        googlePromise = GooglePlacesAdapter.searchProviders({
          latitude: latNum,
          longitude: lonNum,
          radiusKm: radNum,
          specialty,
          careType,
          timeoutMs
        }).catch(err => {
          console.warn('[ProviderSearchService] Google Places search error:', err.message);
          return { success: false, providers: [] };
        });
      }

      const [osmResult, googleResult] = await Promise.all([osmPromise, googlePromise]);

      const baseOsmProviders = (osmResult && osmResult.success && Array.isArray(osmResult.providers)) 
        ? osmResult.providers 
        : [];
      
      const googleProviders = (googleResult && googleResult.success && Array.isArray(googleResult.providers)) 
        ? googleResult.providers 
        : [];

      // 4. Merge and enrich providers across all sources into ONE unified list
      const unifiedProviders = ProviderMerger.mergeAndEnrichProviders(baseOsmProviders, googleProviders, {
        targetSpecialty: specialty
      });

      console.log(`[ProviderSearchService] Unified merger produced ${unifiedProviders.length} enriched provider cards.`);

      const responsePayload = {
        success: true,
        count: unifiedProviders.length,
        providers: unifiedProviders,
        source: googleProviders.length > 0 ? 'multi_source_verified' : 'openstreetmap',
        sourceAttribution: googleProviders.length > 0
          ? '© OpenStreetMap contributors, Google Places, Sri Lanka Ministry of Health'
          : '© OpenStreetMap contributors',
        searchCoordinates: { latitude: latNum, longitude: lonNum },
        searchRadiusKm: radNum,
        cached: false
      };

      // 5. Cache successful results
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
  static async searchProvidersByLocation(locationQuery, options = {}) {
    if (!locationQuery || typeof locationQuery !== 'string' || !locationQuery.trim()) {
      return {
        success: false,
        error: 'LOCATION_REQUIRED',
        message: 'A valid location query string is required.'
      };
    }

    const geoResult = await LocationService.geocodeLocation(locationQuery);
    if (!geoResult.success) {
      return {
        success: false,
        error: geoResult.error,
        message: geoResult.message
      };
    }

    const searchResult = await this.searchProviders({
      latitude: geoResult.latitude,
      longitude: geoResult.longitude,
      radiusKm: options.radiusKm || 25,
      specialty: options.specialty || null,
      careType: options.careType || null,
      timeoutMs: options.timeoutMs || 10000
    });

    if (!searchResult.success) {
      return searchResult;
    }

    return {
      success: true,
      location: {
        query: locationQuery,
        displayName: geoResult.displayName,
        latitude: geoResult.latitude,
        longitude: geoResult.longitude,
        country: geoResult.country,
        region: geoResult.region,
        city: geoResult.city
      },
      ...searchResult
    };
  }

  /**
   * Clears the in-memory provider search cache.
   */
  static clearCache() {
    providerCache.clear();
  }
}

export default ProviderSearchService;
