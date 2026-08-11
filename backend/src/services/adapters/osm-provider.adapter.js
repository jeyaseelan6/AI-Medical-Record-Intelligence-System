import { calculateDistanceKm, inferFacilityType, deduplicateProviders } from '../../utils/provider-normalizer.js';

/**
 * OsmProviderAdapter
 * 
 * Fetches real healthcare facilities, clinics, hospitals, doctor offices, and pharmacies
 * from the OpenStreetMap ecosystem using fast, robust structured spatial amenity searches.
 * 
 * Guarantees:
 * - 100% real public geographic & healthcare directory data
 * - Zero synthetic/fabricated providers
 * - Distinguishes between healthcare facilities, hospitals, clinics, doctor offices, and pharmacies
 * - Exact distance calculation using Haversine formula
 */
export class OsmProviderAdapter {
  
  static get sourceName() {
    return 'openstreetmap';
  }

  /**
   * Searches for real healthcare facilities within a given radius around coordinates.
   * 
   * @param {Object} params
   * @param {number} params.latitude - Search origin latitude
   * @param {number} params.longitude - Search origin longitude
   * @param {number} params.radiusKm - Radius in kilometers (default: 25km)
   * @param {string} params.specialty - Target specialty (for context/filtering)
   * @param {string} params.careType - Care category ('primary_care', 'specialist', 'pharmacist', 'urgent_care')
   * @param {number} params.timeoutMs - Timeout in ms (default: 8000ms)
   * @returns {Promise<Object>} Object containing normalized provider list
   */
  static async searchProviders({ latitude, longitude, radiusKm = 25, specialty = null, careType = null, timeoutMs = 8000 }) {
    if (latitude == null || longitude == null || isNaN(latitude) || isNaN(longitude)) {
      return {
        success: false,
        error: 'INVALID_COORDINATES',
        message: 'Valid latitude and longitude coordinates are required for provider search.',
        providers: []
      };
    }

    const latNum = parseFloat(latitude);
    const lonNum = parseFloat(longitude);
    const radKm = Math.max(1, Math.min(60, parseFloat(radiusKm) || 25));

    // Degree offset approximation (1 degree ~ 111km)
    const degOffset = (radKm / 111.0) * 1.15;
    const minLon = lonNum - degOffset;
    const maxLat = latNum + degOffset;
    const maxLon = lonNum + degOffset;
    const minLat = latNum - degOffset;

    // Filter amenities according to careType
    let targetAmenities = ['hospital', 'clinic', 'doctors', 'pharmacy'];
    if (careType === 'pharmacist') {
      targetAmenities = ['pharmacy', 'clinic', 'doctors'];
    } else if (careType === 'urgent_care') {
      targetAmenities = ['hospital', 'clinic'];
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Parallel queries across target healthcare amenity categories
      const categoryPromises = targetAmenities.map(async (amenity) => {
        const url = `https://nominatim.openstreetmap.org/search?amenity=${encodeURIComponent(amenity)}&format=json&addressdetails=1&limit=15&viewbox=${minLon},${maxLat},${maxLon},${minLat}&bounded=1`;
        
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'MedAI-CareIntelligence/2.0 (contact@medai.clinical)',
            'Accept': 'application/json'
          },
          signal: controller.signal
        });

        if (!res.ok) return [];
        const items = await res.json();
        return Array.isArray(items) ? items : [];
      });

      const rawResultsGroup = await Promise.all(categoryPromises);
      clearTimeout(timer);

      const allRawItems = rawResultsGroup.flat();

      // Normalize raw items
      const normalizedList = allRawItems.map((item) => {
        if (!item || !item.display_name) return null;

        const pLat = parseFloat(item.lat);
        const pLon = parseFloat(item.lon);
        if (isNaN(pLat) || isNaN(pLon)) return null;

        const addr = item.address || {};
        const primaryName = item.name || item.display_name.split(',')[0].trim();
        
        // Assemble clean address
        const street = addr.road || addr.street || addr.place || null;
        const suburb = addr.suburb || addr.neighbourhood || addr.quarter || null;
        const city = addr.city || addr.town || addr.district || addr.county || null;
        const postcode = addr.postcode || null;

        let addressParts = [];
        if (addr.house_number && street) {
          addressParts.push(`${addr.house_number} ${street}`);
        } else if (street) {
          addressParts.push(street);
        }
        if (suburb) addressParts.push(suburb);
        if (city) addressParts.push(city);
        if (postcode) addressParts.push(postcode);

        const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : item.display_name;
        const dist = calculateDistanceKm(latNum, lonNum, pLat, pLon);

        return {
          id: `osm_${item.osm_type || 'node'}_${item.osm_id || item.place_id}`,
          externalId: String(item.osm_id || item.place_id),
          name: primaryName,
          facilityType: inferFacilityType({ amenity: item.type || item.class, name: primaryName }),
          specialty: null,
          category: item.type || item.class || 'healthcare',
          address: fullAddress,
          city: city,
          latitude: pLat,
          longitude: pLon,
          distanceKm: dist,
          phone: null, // OSM Nominatim does not expose phone in basic view; preserved as null
          website: null,
          rating: null, // Strictly null (never fabricated)
          reviewCount: null,
          openingHours: null,
          source: 'openstreetmap',
          sourceAttribution: '© OpenStreetMap contributors',
          mapUrl: `https://www.openstreetmap.org/${item.osm_type || 'node'}/${item.osm_id || ''}`,
          rawTags: {
            class: item.class,
            type: item.type
          }
        };
      }).filter(Boolean);

      // Deduplicate
      const deduplicated = deduplicateProviders(normalizedList);

      // Sort by distance as initial baseline order
      deduplicated.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));

      console.log(`[OsmProviderAdapter] Successfully retrieved ${deduplicated.length} real providers within ${radKm}km of (${latNum}, ${lonNum}).`);

      return {
        success: true,
        count: deduplicated.length,
        providers: deduplicated,
        source: 'openstreetmap',
        sourceAttribution: '© OpenStreetMap contributors',
        searchCoordinates: { latitude: latNum, longitude: lonNum },
        searchRadiusKm: radKm
      };

    } catch (error) {
      clearTimeout(timer);
      console.error('[OsmProviderAdapter Error] Provider search failed:', error.message);
      return {
        success: false,
        error: error.name === 'AbortError' ? 'OSM_SEARCH_TIMEOUT' : 'OSM_SEARCH_ERROR',
        message: error.name === 'AbortError' ? 'Provider search service timed out.' : `Provider search failed: ${error.message}`,
        count: 0,
        providers: []
      };
    }
  }
}

export default OsmProviderAdapter;
