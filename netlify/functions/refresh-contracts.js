const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    })
  });
}

const db = admin.firestore();

// Import city cache
const cityCache = require('../../city-coordinates-cache.json');

// Geocoding helper
async function geocodeLocation(city, state) {
  if (!city || !state) {
    return getStateCenter(state || 'US');
  }
  
  // Check cache first
  if (cityCache[state] && cityCache[state][city]) {
    return cityCache[state][city];
  }
  
  // Fallback to state center if not in cache
  return getStateCenter(state);
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
  console.log('Starting contract refresh at:', new Date().toISOString());
  
  const apiKey = process.env.SAM_API_KEY;
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
    
    console.log('Fetching contracts from SAM.gov...');
    
    const url = `https://api.sam.gov/opportunities/v2/search?api_key=${apiKey}&limit=50&postedFrom=${postedFrom}&postedTo=${postedTo}&ptype=o,k&active=true`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`SAM.gov API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log(`Received ${data.opportunitiesData?.length || 0} contracts`);
    
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
    
    console.log('Storing contracts in Firestore...');
    
    // Store in Firestore using batch
    const batch = db.batch();
    
    // Delete old contracts
    const oldContracts = await db.collection('contracts').get();
    oldContracts.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Add new contracts
    transformedContracts.forEach(contract => {
      const docRef = db.collection('contracts').doc(contract.id);
      batch.set(docRef, contract);
    });
    
    await batch.commit();
    
    // Update metadata
    await db.collection('metadata').doc('lastRefresh').set({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      contractCount: transformedContracts.length,
      processingTime: Date.now() - startTime
    });
    
    console.log(`Successfully refreshed ${transformedContracts.length} contracts in ${Date.now() - startTime}ms`);
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        contractsUpdated: transformedContracts.length,
        processingTime: Date.now() - startTime
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
