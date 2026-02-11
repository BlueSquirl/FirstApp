const admin = require('firebase-admin');

// Firebase Admin is intentionally disabled for local testing.
// Commented out to allow running without FIREBASE_PRIVATE_KEY.
// if (!admin.apps.length) {
//   admin.initializeApp({
//     credential: admin.credential.cert({
//       projectId: process.env.FIREBASE_PROJECT_ID,
//       clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
//       privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
//     })
//   });
// }
// const db = admin.firestore();

// Import city cache
const cityCache = require('../../city-coordinates-cache.json');

// Geocoding helper
async function geocodeLocation(city, state) {
  if (!city || !state) {
    return getStateCenter(state || 'US');
  }
  
  // Normalize city name: trim, lowercase, remove extra spaces
  const normalizedCity = city.trim().toLowerCase().replace(/\s+/g, ' ');
  const normalizedState = String(state).trim().toUpperCase();
  
  // Check cache with normalized names
  if (cityCache[normalizedState]) {
    for (const cachedCity in cityCache[normalizedState]) {
      if (cachedCity.toLowerCase() === normalizedCity) {
        return cityCache[normalizedState][cachedCity];
      }
    }
  }
  
  // Cache miss - use state center
  return getStateCenter(normalizedState);
}

// State centers
function getStateCenter(stateCode) {
  const stateCenters = {
    'TX': { lat: 31.0545, lng: -97.5635 },
    'CA': { lat: 36.7783, lng: -119.4179 },
    'FL': { lat: 27.7663, lng: -81.6868 },
    'NY': { lat: 42.1657, lng: -74.9481 },
    'PA': { lat: 40.5908, lng: -77.2098 },
    'IL': { lat: 40.3495, lng: -88.9861 },
    'OH': { lat: 40.3888, lng: -82.7649 },
    'GA': { lat: 33.0406, lng: -83.6431 },
    'NC': { lat: 35.6301, lng: -79.8064 },
    'MI': { lat: 43.3266, lng: -84.5361 },
    'US': { lat: 39.8283, lng: -98.5795 }
  };
  
  return stateCenters[stateCode] || stateCenters['US'];
}

// Categorize contracts
function categorizeContract(naicsCode) {
  if (!naicsCode) return 'Federal';
  
  const code = String(naicsCode);
  
  if (code.startsWith('23') || code.startsWith('48') || code.startsWith('49')) {
    return 'Transportation';
  }
  
  if (code.startsWith('221') || code.startsWith('562')) {
    return 'Water';
  }
  
  if (code.startsWith('236') || code.startsWith('237')) {
    return 'Municipal';
  }
  
  if (code.startsWith('221') || code.startsWith('486')) {
    return 'Energy';
  }
  
  return 'Federal';
}

exports.handler = async (event, context) => {
  console.log('Starting contract refresh (test mode) at:', new Date().toISOString());
  
  const startTime = Date.now();
  
  try {
    // Build date range
    const today = new Date();
    const ninetyDaysAgo = new Date(today);
    ninetyDaysAgo.setDate(today.getDate() - 90);
    
    const formatDate = (date) => {
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = date.getFullYear();
      return `${month}/${day}/${year}`;
    };
    
    const postedFrom = formatDate(ninetyDaysAgo);
    const postedTo = formatDate(today);
    
    console.log('Using mock SAM.gov data instead of API fetch');
    console.log('Mock date range:', postedFrom, 'to', postedTo);
    
    // Instead of fetching from SAM.gov, use mock data
    const mockOpportunities = [
      {
        noticeId: 'test-001',
        title: 'Highway Repair Contract',
        award: { amount: 1500000 },
        responseDeadLine: '2026-03-15T17:00:00-06:00',
        placeOfPerformance: { city: { name: 'Houston' }, state: { code: 'TX' } },
        department: 'Texas DOT',
        naicsCode: '237310',
        pointOfContact: [{ email: 'contact@txdot.gov' }]
      },
      {
        noticeId: 'test-002',
        title: 'Water Treatment Plant Upgrade',
        award: { amount: 3200000 },
        responseDeadLine: '2026-04-01T17:00:00-06:00',
        placeOfPerformance: { city: { name: 'Dallas' }, state: { code: 'TX' } },
        department: 'Dallas Water Utilities',
        naicsCode: '237110',
        pointOfContact: [{ email: 'bids@dallascityhall.com' }]
      },
      {
        noticeId: 'test-003',
        title: 'Municipal Building Construction',
        award: { amount: 5000000 },
        responseDeadLine: '2026-03-20T17:00:00-06:00',
        placeOfPerformance: { city: { name: 'Austin' }, state: { code: 'TX' } },
        department: 'City of Austin',
        naicsCode: '236220',
        pointOfContact: [{ email: 'procurement@austintexas.gov' }]
      },
      {
        noticeId: 'test-004',
        title: 'Bridge Deck Rehabilitation',
        award: { amount: 2100000 },
        responseDeadLine: '2026-03-28T17:00:00-06:00',
        placeOfPerformance: { city: { name: 'San Antonio' }, state: { code: 'TX' } },
        department: 'Bexar County',
        naicsCode: '237310',
        pointOfContact: [{ email: 'bids@bexarcounty.org' }]
      },
      {
        noticeId: 'test-005',
        title: 'Wastewater Collection System Improvements',
        award: { amount: 2750000 },
        responseDeadLine: '2026-04-05T17:00:00-06:00',
        placeOfPerformance: { city: { name: 'Fort Worth' }, state: { code: 'TX' } },
        department: 'Fort Worth Water',
        naicsCode: '237110',
        pointOfContact: [{ email: 'contracts@fortworthtexas.gov' }]
      },
      {
        noticeId: 'test-006',
        title: 'Transit Station Electrical Upgrade',
        award: { amount: 1800000 },
        responseDeadLine: '2026-03-31T17:00:00-06:00',
        placeOfPerformance: { city: { name: 'El Paso' }, state: { code: 'TX' } },
        department: 'Sun Metro',
        naicsCode: '238210',
        pointOfContact: [{ email: 'procurement@elpasotexas.gov' }]
      },
      {
        noticeId: 'test-007',
        title: 'Municipal Facility Renovation',
        award: { amount: 1400000 },
        responseDeadLine: '2026-04-10T17:00:00-06:00',
        placeOfPerformance: { city: { name: 'Arlington' }, state: { code: 'TX' } },
        department: 'City of Arlington',
        naicsCode: '236220',
        pointOfContact: [{ email: 'bids@arlingtontx.gov' }]
      },
      {
        noticeId: 'test-008',
        title: 'Coastal Drainage Improvements',
        award: { amount: 950000 },
        responseDeadLine: '2026-03-27T17:00:00-06:00',
        placeOfPerformance: { city: { name: 'Corpus Christi' }, state: { code: 'TX' } },
        department: 'Corpus Christi Public Works',
        naicsCode: '237990',
        pointOfContact: [{ email: 'contracts@cctexas.com' }]
      },
      {
        noticeId: 'test-009',
        title: 'Street Lighting Replacement',
        award: { amount: 1250000 },
        responseDeadLine: '2026-04-12T17:00:00-06:00',
        placeOfPerformance: { city: { name: 'Plano' }, state: { code: 'TX' } },
        department: 'Plano Engineering',
        naicsCode: '238210',
        pointOfContact: [{ email: 'purchasing@plano.gov' }]
      },
      {
        noticeId: 'test-010',
        title: 'Roadway Resurfacing Package',
        award: { amount: 3100000 },
        responseDeadLine: '2026-04-15T17:00:00-06:00',
        placeOfPerformance: { city: { name: 'Laredo' }, state: { code: 'TX' } },
        department: 'City of Laredo',
        naicsCode: '237310',
        pointOfContact: [{ email: 'bids@ci.laredo.tx.us' }]
      }
    ];
    
    const data = { opportunitiesData: mockOpportunities };
    
    console.log(`Received ${data.opportunitiesData?.length || 0} opportunities from mock data`);
    
    if (!data.opportunitiesData || data.opportunitiesData.length === 0) {
      console.error('No opportunities data received from mock data');
    }
    
    // Transform contracts
    const transformedContracts = [];
    
    for (const opportunity of data.opportunitiesData || []) {
      const city = opportunity.placeOfPerformance?.city?.name || null;
      const state = opportunity.placeOfPerformance?.state?.code || null;
      
      const coords = await geocodeLocation(city, state);
      
      transformedContracts.push({
        id: opportunity.noticeId,
        title: opportunity.title,
        value: opportunity.award?.amount ? `$${parseInt(opportunity.award.amount).toLocaleString()}` : 'N/A',
        dueDate: opportunity.responseDeadLine || 'N/A',
        location: city && state ? `${city}, ${state}` : (state || 'N/A'),
        lat: coords.lat,
        lng: coords.lng,
        agency: [opportunity.department, opportunity.subtier, opportunity.office].filter(Boolean).join(' - '),
        category: categorizeContract(opportunity.naicsCode || opportunity.classificationCode),
        contactEmail: opportunity.pointOfContact?.[0]?.email || 'N/A',
        description: opportunity.title,
        source: 'SAM.gov'
      });
    }
    
    console.log(`Prepared ${transformedContracts.length} contracts (local test mode)`);
    console.log('Sample contract structure:', transformedContracts[0]);
    console.log('Transformed contracts:', transformedContracts);
    console.log(`Completed test refresh in ${Date.now() - startTime}ms`);
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        contractsUpdated: transformedContracts.length,
        processingTime: Date.now() - startTime,
        contracts: transformedContracts
      })
    };
    
  } catch (error) {
    console.error('Refresh error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message })
    };
  }
};
