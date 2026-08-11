import { normalizeGooglePlace, deduplicateProviders } from '../../utils/provider-normalizer.js';

/**
 * GooglePlacesAdapter
 * 
 * Pluggable provider adapter for Google Places API (New).
 * Activated dynamically if GOOGLE_PLACES_API_KEY is defined in the environment.
 */
export class GooglePlacesAdapter {

  static get sourceName() {
    return 'google_places';
  }

  static isConfigured() {
    return Boolean(process.env.GOOGLE_PLACES_API_KEY && process.env.GOOGLE_PLACES_API_KEY.trim().length > 10);
  }

  /**
   * Searches for nearby healthcare places using the Google Places API (New).
   * 
   * @param {Object} params
   * @param {number} params.latitude
   * @param {number} params.longitude
   * @param {number} params.radiusKm
   * @param {string} params.specialty
   * @param {string} params.careType
   * @param {number} params.timeoutMs
   * @returns {Promise<Object>}
   */
  static async searchProviders({ latitude, longitude, radiusKm = 25, specialty = null, careType = null, timeoutMs = 8000 }) {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: 'GOOGLE_PLACES_KEY_MISSING',
        message: 'Google Places API key is not configured in server environment.',
        providers: []
      };
    }

    const radiusMeters = Math.min(50000, Math.round(radiusKm * 1000));
    const url = 'https://places.googleapis.com/v1/places:searchNearby';

    let includedTypes = ['hospital', 'doctor', 'pharmacy', 'medical_clinic'];
    if (careType === 'pharmacist') {
      includedTypes = ['pharmacy', 'drugstore'];
    }

    const requestBody = {
      includedTypes: includedTypes,
      maxResultCount: 20,
      locationRestriction: {
        circle: {
          center: {
            latitude: latitude,
            longitude: longitude
          },
          radius: radiusMeters
        }
      }
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.id,places.name,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.nationalPhoneNumber,places.websiteUri,places.googleMapsUri,places.primaryType,places.primaryTypeDisplayName,places.types'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[GooglePlacesAdapter Error] HTTP failure:', response.status, errorText);
        return {
          success: false,
          error: `GOOGLE_PLACES_HTTP_${response.status}`,
          message: `Google Places API returned status ${response.status}`,
          providers: []
        };
      }

      const data = await response.json();
      const rawPlaces = data.places || [];

      const normalized = rawPlaces
        .map(p => normalizeGooglePlace(p, latitude, longitude))
        .filter(Boolean);

      const deduplicated = deduplicateProviders(normalized);

      console.log(`[GooglePlacesAdapter] Retrieved ${deduplicated.length} providers from Google Places API.`);
      return {
        success: true,
        count: deduplicated.length,
        providers: deduplicated,
        source: 'google_places',
        sourceAttribution: 'Google Places API',
        searchCoordinates: { latitude, longitude },
        searchRadiusKm: radiusKm
      };

    } catch (error) {
      clearTimeout(timer);
      console.error('[GooglePlacesAdapter Error] Request failed:', error.message);
      return {
        success: false,
        error: error.name === 'AbortError' ? 'GOOGLE_PLACES_TIMEOUT' : 'GOOGLE_PLACES_ERROR',
        message: error.message,
        providers: []
      };
    }
  }
}

export default GooglePlacesAdapter;
