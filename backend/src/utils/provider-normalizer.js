/**
 * Provider Normalizer & Geographic Utilities
 * 
 * Standardizes raw external provider data from heterogeneous data sources
 * (OpenStreetMap/Overpass, Google Places, etc.) into a unified internal representation.
 * 
 * Rules:
 * - Never invent ratings, phone numbers, addresses, or websites.
 * - Missing fields must remain null.
 * - Source attribution and external map links must be preserved.
 * - Deduplication combines external IDs and proximity/name keys without merging distinct clinics.
 */

/**
 * Calculates the great-circle distance between two coordinates using the Haversine formula.
 * 
 * @param {number} lat1 - Latitude of origin
 * @param {number} lon1 - Longitude of origin
 * @param {number} lat2 - Latitude of destination
 * @param {number} lon2 - Longitude of destination
 * @returns {number} Distance in kilometers rounded to 2 decimal places
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
    return null;
  }

  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return parseFloat(distance.toFixed(2));
}

/**
 * Categorizes the primary facility type based on raw external tags.
 * 
 * @param {Object} tags - Raw tag dictionary
 * @returns {string} One of: 'hospital', 'clinic', 'doctors', 'pharmacy', 'healthcare_facility'
 */
export function inferFacilityType(tags = {}) {
  const amenity = (tags.amenity || '').toLowerCase();
  const healthcare = (tags.healthcare || '').toLowerCase();
  const name = (tags.name || '').toLowerCase();

  if (amenity === 'hospital' || healthcare === 'hospital' || name.includes('hospital')) {
    return 'hospital';
  }
  if (amenity === 'clinic' || healthcare === 'clinic' || healthcare === 'centre' || name.includes('clinic') || name.includes('dispensary') || name.includes('medical centre') || name.includes('medical center')) {
    return 'clinic';
  }
  if (amenity === 'doctors' || healthcare === 'doctor' || name.includes('dr.') || name.includes('doctor')) {
    return 'doctors';
  }
  if (amenity === 'pharmacy' || healthcare === 'pharmacy' || name.includes('pharmacy') || name.includes('chemist') || name.includes('drug store')) {
    return 'pharmacy';
  }
  return 'healthcare_facility';
}

/**
 * Normalizes an OpenStreetMap Overpass element into a standardized Provider record.
 * 
 * @param {Object} element - Raw Overpass element (node or way)
 * @param {number} originLat - Origin search latitude for distance calculation
 * @param {number} originLng - Origin search longitude for distance calculation
 * @returns {Object|null} Normalized provider object or null if invalid
 */
export function normalizeOsmElement(element, originLat = null, originLng = null) {
  if (!element || typeof element !== 'object') return null;

  const tags = element.tags || {};
  const name = tags.name || tags['name:en'] || tags.operator;
  if (!name || !name.trim()) {
    // Skip un-named amenities to ensure real displayable providers
    return null;
  }

  const lat = element.lat != null ? element.lat : (element.center ? element.center.lat : null);
  const lon = element.lon != null ? element.lon : (element.center ? element.center.lon : null);

  if (lat == null || lon == null) {
    return null;
  }

  // Address assembly from OSM address tags
  const street = tags['addr:street'] || tags['addr:place'] || tags['addr:road'] || null;
  const housenumber = tags['addr:housenumber'] || null;
  const city = tags['addr:city'] || tags['addr:town'] || tags['addr:suburb'] || tags['addr:district'] || null;
  const postcode = tags['addr:postcode'] || null;

  let addressParts = [];
  if (housenumber && street) {
    addressParts.push(`${housenumber} ${street}`);
  } else if (street) {
    addressParts.push(street);
  }
  if (city) addressParts.push(city);
  if (postcode) addressParts.push(postcode);

  const address = addressParts.length > 0 ? addressParts.join(', ') : null;

  // Contact details
  const phone = tags.phone || tags['contact:phone'] || tags['contact:mobile'] || null;
  const website = tags.website || tags['contact:website'] || tags.url || null;

  // Specialty
  const rawSpecialty = tags['healthcare:speciality'] || tags['medical_system:western'] || tags.speciality || null;

  // Distance calculation
  const distanceKm = (originLat != null && originLng != null)
    ? calculateDistanceKm(originLat, originLng, lat, lon)
    : null;

  const osmId = `${element.type || 'node'}_${element.id}`;
  const mapUrl = `https://www.openstreetmap.org/${element.type || 'node'}/${element.id}`;

  return {
    id: `osm_${osmId}`,
    externalId: String(element.id),
    name: name.trim(),
    facilityType: inferFacilityType(tags),
    specialty: rawSpecialty ? rawSpecialty.trim() : null,
    category: tags.amenity || tags.healthcare || 'healthcare',
    address: address,
    city: city,
    latitude: parseFloat(lat),
    longitude: parseFloat(lon),
    distanceKm: distanceKm,
    phone: phone ? phone.trim() : null,
    website: website ? website.trim() : null,
    rating: null, // OpenStreetMap does not have user ratings; strictly preserved as null
    reviewCount: null,
    openingHours: tags.opening_hours || null,
    source: 'openstreetmap',
    sourceAttribution: '© OpenStreetMap contributors',
    mapUrl: mapUrl,
    rawTags: {
      amenity: tags.amenity || null,
      healthcare: tags.healthcare || null,
      operator: tags.operator || null
    }
  };
}

/**
 * Normalizes a Google Places API result into a standardized Provider record.
 * 
 * @param {Object} place - Raw Google Place object
 * @param {number} originLat - Origin search latitude
 * @param {number} originLng - Origin search longitude
 * @returns {Object|null} Normalized provider object
 */
export function normalizeGooglePlace(place, originLat = null, originLng = null) {
  if (!place || typeof place !== 'object' || !place.displayName && !place.name) {
    return null;
  }

  const name = (place.displayName ? place.displayName.text : place.name) || '';
  const lat = place.location ? place.location.latitude : null;
  const lng = place.location ? place.location.longitude : null;

  if (!name.trim() || lat == null || lng == null) {
    return null;
  }

  const distanceKm = (originLat != null && originLng != null)
    ? calculateDistanceKm(originLat, originLng, lat, lng)
    : null;

  return {
    id: `google_${place.id || place.place_id || encodeURIComponent(name)}`,
    externalId: place.id || place.place_id || null,
    name: name.trim(),
    facilityType: (place.primaryType || '').includes('hospital') ? 'hospital' : 'clinic',
    specialty: place.primaryTypeDisplayName ? place.primaryTypeDisplayName.text : null,
    category: place.primaryType || 'healthcare',
    address: place.formattedAddress || place.vicinity || null,
    city: null,
    latitude: parseFloat(lat),
    longitude: parseFloat(lng),
    distanceKm: distanceKm,
    phone: place.nationalPhoneNumber || place.internationalPhoneNumber || null,
    website: place.websiteUri || null,
    rating: typeof place.rating === 'number' ? place.rating : null,
    reviewCount: typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
    openingHours: place.currentOpeningHours ? place.currentOpeningHours.openNow : null,
    source: 'google_places',
    sourceAttribution: 'Google Places API',
    mapUrl: place.googleMapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${place.id || ''}`,
    rawTags: {
      types: place.types || []
    }
  };
}

/**
 * Deduplicates a list of normalized providers deterministically.
 * Uses external IDs, exact coordinate matches, and normalized name proximity keys.
 * 
 * @param {Array<Object>} providers - List of normalized provider objects
 * @returns {Array<Object>} Deduplicated provider list
 */
export function deduplicateProviders(providers = []) {
  if (!Array.isArray(providers) || providers.length === 0) {
    return [];
  }

  const seenIds = new Set();
  const seenSpatialKeys = new Set();
  const deduplicated = [];

  for (const provider of providers) {
    if (!provider || !provider.name) continue;

    // Primary ID match
    if (provider.id && seenIds.has(provider.id)) {
      continue;
    }

    // Spatial & name deduplication (within ~100m with identical normalized name)
    const normName = provider.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const latRounded = provider.latitude != null ? provider.latitude.toFixed(3) : '0';
    const lngRounded = provider.longitude != null ? provider.longitude.toFixed(3) : '0';
    const spatialKey = `${normName}_${latRounded}_${lngRounded}`;

    if (seenSpatialKeys.has(spatialKey)) {
      continue;
    }

    if (provider.id) seenIds.add(provider.id);
    seenSpatialKeys.add(spatialKey);
    deduplicated.push(provider);
  }

  return deduplicated;
}

export default {
  calculateDistanceKm,
  inferFacilityType,
  normalizeOsmElement,
  normalizeGooglePlace,
  deduplicateProviders
};
