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

// Comprehensive NAICS code to category mapping
const NAICS_CATEGORIES = {
  '23': 'Construction',
  '236': 'Construction',
  '237': 'Construction',
  '2371': 'Infrastructure',
  '23711': 'Water & Utilities',
  '23712': 'Energy',
  '2373': 'Transportation',
  '238': 'Construction',
  '221': 'Energy & Utilities',
  '2211': 'Energy',
  '2213': 'Water & Utilities',
  '48': 'Transportation & Logistics',
  '49': 'Transportation & Logistics',
  '486': 'Energy',
  '562': 'Environmental Services',
  '531': 'Real Estate',
  '5311': 'Real Estate',
  '5312': 'Real Estate',
  '5313': 'Real Estate',
  '621': 'Healthcare',
  '6211': 'Healthcare',
  '6212': 'Healthcare',
  '6213': 'Healthcare',
  '6214': 'Healthcare',
  '6215': 'Healthcare',
  '6216': 'Healthcare',
  '6219': 'Healthcare',
  '622': 'Healthcare',
  '623': 'Healthcare',
  '5112': 'IT & Software',
  '518': 'IT & Software',
  '5182': 'IT & Software',
  '5415': 'IT & Software',
  '54151': 'IT & Software',
  '541511': 'IT & Software',
  '541512': 'IT & Software',
  '541513': 'IT & Software',
  '541519': 'IT & Software',
  '541': 'Professional Services',
  '5411': 'Legal Services',
  '5412': 'Accounting Services',
  '5413': 'Architecture & Engineering',
  '5414': 'Design Services',
  '5416': 'Management Consulting',
  '5417': 'Scientific R&D',
  '5418': 'Marketing & Advertising',
  '5419': 'Other Professional Services',
  '42': 'Wholesale Trade',
  '423': 'Merchant Wholesalers - Durable Goods',
  '424': 'Merchant Wholesalers - Nondurable Goods',
  '425': 'Wholesale Electronic Markets',
  '31': 'Manufacturing',
  '32': 'Manufacturing',
  '33': 'Manufacturing',
  '611': 'Education & Training',
  '52': 'Finance & Insurance',
  '522': 'Finance',
  '524': 'Insurance',
  '722': 'Food Services',
  '561': 'Administrative Services',
  '5614': 'Business Support Services',
  '5615': 'Travel Arrangement',
  '5616': 'Security Services',
  '5617': 'Facility Support Services',
  '928': 'Defense & National Security',
  '92811': 'Defense',
  '92': 'Government Services'
};

function categorizeContract(naicsCode) {
  if (!naicsCode) return 'Federal';
  const code = String(naicsCode).trim();
  for (let len = code.length; len >= 1; len--) {
    const prefix = code.slice(0, len);
    if (NAICS_CATEGORIES[prefix]) return NAICS_CATEGORIES[prefix];
  }
  return 'Federal';
}

// 7 AM–5 PM CST = 13:00–23:59 UTC (CST is UTC-6)
function isBusinessHoursUTC() {
  const hour = new Date().getUTCHours();
  return hour >= 13 && hour <= 23;
}

exports.handler = async (event, context) => {
  const businessHours = isBusinessHoursUTC();
  const limit = businessHours ? 100 : 50;
  console.log(businessHours ? 'Starting refresh (business hours mode, limit=100)' : 'Starting refresh (off hours mode, limit=50)');

  const apiKey = process.env.SAM_API_KEY;
  if (!apiKey) {
    console.error('SAM_API_KEY is not set');
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'SAM_API_KEY is not set' }) };
  }

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

    let allOpportunities = [];
    const usersSnapshot = await db.collection('users').get();
    const allPreferences = [];
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      if (userData.preferences && (userData.preferences.states?.length || userData.preferences.industries?.length)) {
        allPreferences.push(userData.preferences);
      }
    });
    const uniqueStates = [...new Set(allPreferences.flatMap(p => p.states || []))].filter(Boolean);

    if (uniqueStates.length > 0) {
      console.log(`Fetching contracts for ${uniqueStates.length} states across ${allPreferences.length} users`);
      const seenIds = new Set();
      for (const state of uniqueStates) {
        const url = `https://api.sam.gov/opportunities/v2/search?api_key=${apiKey}&limit=${limit}&postedFrom=${postedFrom}&postedTo=${postedTo}&state=${state}&ptype=o,k&active=true`;
        const response = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });
        if (response.ok) {
          const data = await response.json();
          (data.opportunitiesData || []).forEach(opp => {
            if (opp.noticeId && !seenIds.has(opp.noticeId)) {
              seenIds.add(opp.noticeId);
              allOpportunities.push(opp);
            }
          });
        }
      }
    }

    if (allOpportunities.length === 0) {
      const url = `https://api.sam.gov/opportunities/v2/search?api_key=${apiKey}&limit=${limit}&postedFrom=${postedFrom}&postedTo=${postedTo}&ptype=o,k&active=true`;
      const response = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });
      if (!response.ok) throw new Error(`SAM.gov API error: ${response.status}`);
      const data = await response.json();
      allOpportunities = data.opportunitiesData || [];
    }

    console.log(`Received ${allOpportunities.length} contracts`);

    if (allOpportunities.length === 0) {
      console.error('No opportunities data received from SAM.gov');
    }

    const transformedContracts = [];
    for (const opportunity of allOpportunities) {
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
        description: opportunity.description || opportunity.title || 'No description available',
        solicitationNumber: opportunity.solicitationNumber || 'N/A',
        url: opportunity.uiLink || opportunity.additionalInfoLink || 'https://sam.gov',
        postedDate: opportunity.postedDate || null,
        source: 'SAM.gov'
      });
    }
    
    // Store in Firestore using batch
    const batch = db.batch();

    // Delete old contracts
    const oldContracts = await db.collection('contracts').get();
    oldContracts.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Add new contracts
    transformedContracts.forEach((contract) => {
      const docRef = db.collection('contracts').doc(contract.id);
      batch.set(docRef, contract);
    });

    try {
      await batch.commit();
      console.log('Batch commit successful');
    } catch (error) {
      console.error('Batch commit failed:', error.message);
      throw error;
    }
    
    // Update metadata
    await db.collection('metadata').doc('lastRefresh').set({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      contractCount: transformedContracts.length,
      processingTime: Date.now() - startTime
    });

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
