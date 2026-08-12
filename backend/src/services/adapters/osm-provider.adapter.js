import { deduplicateProviders, calculateDistanceKm, inferFacilityType } from '../../utils/provider-normalizer.js';

/**
 * OsmProviderAdapter
 * 
 * Public OpenStreetMap Provider Search Adapter.
 * Discovers real physical hospitals, clinics, pharmacies, and physicians within a spatial bounding box.
 * 
 * Rules:
 * - Real data only. Zero fabricated doctors, ratings, or contact details.
 * - Missing fields strictly preserved as null.
 * - OpenStreetMap attribution preserved.
 */

export class OsmProviderAdapter {

  /**
   * Searches for real healthcare facilities within a given radius around coordinates.
   * 
   * @param {Object} params
   * @param {number} params.latitude - Search origin latitude
   * @param {number} params.longitude - Search origin longitude
   * @param {number} params.radiusKm - Radius in kilometers (default: 25km)
   * @param {string} params.specialty - Target specialty (for context/filtering)
   * @param {string} params.careType - Care category ('primary_care', 'specialist', 'pharmacist', 'urgent_care')
   * @param {number} params.timeoutMs - Timeout in ms (default: 12000ms)
   * @returns {Promise<Object>} Object containing normalized provider list
   */
  static async searchProviders({ latitude, longitude, radiusKm = 25, specialty = null, careType = null, timeoutMs = 12000 }) {
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

    try {
      // Execute queries with individual fault tolerance
      const categoryPromises = targetAmenities.map(async (amenity) => {
        const url = `https://nominatim.openstreetmap.org/search?amenity=${encodeURIComponent(amenity)}&format=json&addressdetails=1&limit=15&viewbox=${minLon},${maxLat},${maxLon},${minLat}&bounded=1`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        try {
          const res = await fetch(url, {
            headers: {
              'User-Agent': 'MedAI-CareIntelligence/2.0 (health-platform@medai.clinical)',
              'Accept': 'application/json'
            },
            signal: controller.signal
          });
          clearTimeout(timer);
          if (!res.ok) return [];
          const items = await res.json();
          return Array.isArray(items) ? items : [];
        } catch {
          clearTimeout(timer);
          return [];
        }
      });

      const settledResults = await Promise.allSettled(categoryPromises);
      const allRawItems = settledResults
        .filter(r => r.status === 'fulfilled' && Array.isArray(r.value))
        .flatMap(r => r.value);

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
          phone: null,
          website: null,
          rating: null,
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

      // Deduplicate overlapping bounding boxes and sort by proximity
      const uniqueProviders = deduplicateProviders(normalizedList);
      uniqueProviders.sort((a, b) => (a.distanceKm || 999) - (b.distanceKm || 999));

      console.log(`[OsmProviderAdapter] Successfully retrieved ${uniqueProviders.length} real providers within ${radiusKm}km of (${latNum}, ${lonNum}).`);

      return {
        success: true,
        total: uniqueProviders.length,
        providers: uniqueProviders,
        source: 'openstreetmap',
        sourceAttribution: '© OpenStreetMap contributors'
      };

    } catch (err) {
      console.error('[OsmProviderAdapter Error] Provider search failed:', err.message);
      return {
        success: false,
        error: 'OSM_SERVICE_ERROR',
        message: 'Healthcare provider directory is temporarily unreachable. Please try again.',
        providers: []
      };
    }
  }
}

export default OsmProviderAdapter;
