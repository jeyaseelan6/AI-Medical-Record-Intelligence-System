/**
 * ChannelingAdapter
 * 
 * Legitimate Doctor Channeling & Appointment Integration Adapter.
 * Connects hospitals with verified doctor channeling services (Doc990 / eChannelling / Hospital Desks)
 * without scraping or fabricating synthetic doctor schedules.
 * 
 * Rules:
 * - Never scrape websites or invent artificial doctor slots.
 * - If channeling is available, provide official booking links and verified telephone hotlines.
 * - If unavailable, cleanly return null (zero fabrication).
 */

// Known certified channeling hospitals and private hospital networks in Sri Lanka
// Doc990's official verified portal is https://www.doc.lk/ (powered by Dialog Axiata / Digital Health)
const CERTIFIED_CHANNELING_FACILITIES = [
  { matchWords: ['jaffna teaching', 'teaching hospital jaffna', 'northern central', 'yaarl hospital', 'noolaham'], platform: 'Doc990 / Hospital Channeling Desk', hotline: '0117 990 990', url: 'https://www.doc.lk/' },
  { matchWords: ['national hospital', 'nhsl', 'asiri', 'nawaloka', 'durdans', 'lanka hospital', 'hemas', 'kings hospital', 'ninewells'], platform: 'Doc990 / eChannelling', hotline: '0117 990 990', url: 'https://www.doc.lk/' },
  { matchWords: ['kandy general', 'national hospital kandy', 'suwasewana', 'kandy private'], platform: 'Doc990 / Hospital Channeling', hotline: '0117 990 990', url: 'https://www.doc.lk/' },
  { matchWords: ['negombo general', 'district general hospital negombo', 'ave maria', 'negombo hospital', 'st. joseph'], platform: 'Doc990 / Hospital Channeling Desk', hotline: '0117 990 990', url: 'https://www.doc.lk/' }
];

export class ChannelingAdapter {

  /**
   * Enriches a facility with legitimate doctor channeling availability.
   * 
   * @param {Object} provider
   * @param {string} targetSpecialty
   * @returns {Object|null} Channeling metadata or null
   */
  static getChannelingDetails(provider, targetSpecialty = null) {
    if (!provider || !provider.name) return null;

    const normName = provider.name.toLowerCase();
    const facilityType = provider.facilityType || '';

    // Hospitals and specialized medical centres support consultant channeling
    const isHospitalOrCentre = facilityType === 'hospital' || normName.includes('hospital') || normName.includes('medical centre') || normName.includes('clinic');

    if (!isHospitalOrCentre) {
      return null;
    }

    const matchedConfig = CERTIFIED_CHANNELING_FACILITIES.find(c => 
      c.matchWords.some(w => normName.includes(w))
    );

    if (matchedConfig) {
      const specText = targetSpecialty ? targetSpecialty.trim() : null;

      return {
        available: true,
        platform: matchedConfig.platform,
        bookingUrl: matchedConfig.url,
        hotline: matchedConfig.hotline,
        targetSpecialty: specText,
        notes: `Consultant ${specText ? specText + ' ' : ''}channeling appointments available at this facility.`
      };
    }

    // Default: Check if facility has government or official channeling desk
    if (provider.governmentVerification?.hasChannelingDesk) {
      return {
        available: true,
        platform: provider.governmentVerification.channelingPlatform || 'Hospital OPD Channeling Desk',
        bookingUrl: 'https://www.doc.lk/',
        hotline: '0117 990 990',
        targetSpecialty: targetSpecialty || null,
        notes: 'Consultant doctor clinics available through official hospital channeling.'
      };
    }

    return null;
  }
}

export default ChannelingAdapter;
