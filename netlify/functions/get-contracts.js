// Netlify Function: Fetch and transform SAM.gov opportunities.
// TODO: Replace with a secure backend service if needed.

const cityCache = require("../../city-coordinates-cache.json");

const SAM_API_URL = "https://api.sam.gov/opportunities/v2/search";
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function formatDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

function parseAmount(amount) {
  if (amount === null || amount === undefined) {
    return null;
  }
  const numeric = Number(String(amount).replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
}

function formatCurrency(amount) {
  if (!Number.isFinite(amount)) {
    return "N/A";
  }
  return `$${Math.round(amount).toLocaleString("en-US")}`;
}

function categorizeContract(naicsCode) {
  if (!naicsCode) {
    return "Federal";
  }

  const code = String(naicsCode);

  if (code.startsWith("23") || code.startsWith("48") || code.startsWith("49")) {
    return "Transportation";
  }
  if (code.startsWith("221") || code.startsWith("562")) {
    return "Water";
  }
  if (code.startsWith("236") || code.startsWith("237")) {
    return "Municipal";
  }
  if (code.startsWith("221") || code.startsWith("486")) {
    return "Energy";
  }
  return "Federal";
}

function buildAgency(department, subtier, office) {
  return [department, subtier, office].filter(Boolean).join(" - ");
}

function buildLocation(placeOfPerformance) {
  const city = placeOfPerformance?.city?.name;
  const state = placeOfPerformance?.state?.code;
  if (city && state) {
    return `${city}, ${state}`;
  }
  if (state) {
    return state;
  }
  return "Unknown";
}

function getContactEmail(pointOfContact) {
  if (!Array.isArray(pointOfContact) || pointOfContact.length === 0) {
    return "N/A";
  }
  return pointOfContact[0]?.email || "N/A";
}

function getStateCenter(stateCode) {
  const stateCenters = {
    AL: { lat: 32.8067, lng: -86.7911 },
    AK: { lat: 61.3707, lng: -152.4044 },
    AZ: { lat: 33.7298, lng: -111.4312 },
    AR: { lat: 34.9697, lng: -92.3731 },
    CA: { lat: 36.7783, lng: -119.4179 },
    CO: { lat: 39.0598, lng: -105.3111 },
    CT: { lat: 41.5978, lng: -72.7554 },
    DE: { lat: 39.3185, lng: -75.5071 },
    FL: { lat: 27.7663, lng: -81.6868 },
    GA: { lat: 33.0406, lng: -83.6431 },
    HI: { lat: 21.0943, lng: -157.4983 },
    ID: { lat: 44.2405, lng: -114.4788 },
    IL: { lat: 40.3495, lng: -88.9861 },
    IN: { lat: 39.8494, lng: -86.2583 },
    IA: { lat: 42.0115, lng: -93.2105 },
    KS: { lat: 38.5266, lng: -96.7265 },
    KY: { lat: 37.6681, lng: -84.6701 },
    LA: { lat: 31.1695, lng: -91.8678 },
    ME: { lat: 44.6939, lng: -69.3819 },
    MD: { lat: 39.0639, lng: -76.8021 },
    MA: { lat: 42.2302, lng: -71.5301 },
    MI: { lat: 43.3266, lng: -84.5361 },
    MN: { lat: 45.6945, lng: -93.9002 },
    MS: { lat: 32.7416, lng: -89.6787 },
    MO: { lat: 38.4561, lng: -92.2884 },
    MT: { lat: 46.9219, lng: -110.4544 },
    NE: { lat: 41.1254, lng: -98.2681 },
    NV: { lat: 38.3135, lng: -117.0554 },
    NH: { lat: 43.4525, lng: -71.5639 },
    NJ: { lat: 40.2989, lng: -74.521 },
    NM: { lat: 34.8405, lng: -106.2485 },
    NY: { lat: 42.1657, lng: -74.9481 },
    NC: { lat: 35.6301, lng: -79.8064 },
    ND: { lat: 47.5289, lng: -99.784 },
    OH: { lat: 40.3888, lng: -82.7649 },
    OK: { lat: 35.5653, lng: -96.9289 },
    OR: { lat: 44.572, lng: -122.0709 },
    PA: { lat: 40.5908, lng: -77.2098 },
    RI: { lat: 41.6809, lng: -71.5118 },
    SC: { lat: 33.8569, lng: -80.945 },
    SD: { lat: 44.2998, lng: -99.4388 },
    TN: { lat: 35.7478, lng: -86.6923 },
    TX: { lat: 31.0545, lng: -97.5635 },
    UT: { lat: 40.15, lng: -111.8624 },
    VT: { lat: 44.0459, lng: -72.7107 },
    VA: { lat: 37.7693, lng: -78.17 },
    WA: { lat: 47.4009, lng: -121.4905 },
    WV: { lat: 38.4912, lng: -80.9545 },
    WI: { lat: 44.2685, lng: -89.6165 },
    WY: { lat: 42.7559, lng: -107.3025 },
    DC: { lat: 38.9072, lng: -77.0369 },
    US: { lat: 39.8283, lng: -98.5795 },
  };

  return stateCenters[stateCode] || stateCenters.US;
}

async function geocodeLocation(city, state) {
  if (!city || !state) {
    return getStateCenter(state || "US");
  }

  if (cityCache[state] && cityCache[state][city]) {
    console.log(`Cache hit: ${city}, ${state}`);
    return cityCache[state][city];
  }

  console.log(`Cache miss: ${city}, ${state} - geocoding...`);
  try {
    const query = encodeURIComponent(`${city}, ${state}, USA`);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
      {
        headers: {
          "User-Agent": "ContractMap/1.0",
        },
      }
    );

    const data = await response.json();
    if (data && data.length > 0) {
      const coords = {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
      console.log(`Geocoded: ${city}, ${state} -> ${coords.lat}, ${coords.lng}`);
      return coords;
    }
    return getStateCenter(state);
  } catch (error) {
    console.error(`Geocoding error for ${city}, ${state}:`, error);
    return getStateCenter(state);
  }
}

exports.handler = async (event) => {
  try {
    const apiKey = process.env.SAM_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
        },
        body: JSON.stringify({ error: "SAM.gov API key is not configured." }),
      };
    }

    const params = new URLSearchParams(event.queryStringParameters || {});
    const limit = Number(params.get("limit")) || 100;
    const state = params.get("state");

    const postedTo = new Date();
    const postedFrom = new Date();
    postedFrom.setDate(postedTo.getDate() - 90);
    console.log("Date range:", formatDate(postedFrom), "to", formatDate(postedTo));

    const apiParams = new URLSearchParams({
      api_key: apiKey,
      limit: String(limit),
      postedFrom: formatDate(postedFrom),
      postedTo: formatDate(postedTo),
      active: "Yes",
    });

    if (state) {
      apiParams.set("state", state);
    }

    const response = await fetch(`${SAM_API_URL}?${apiParams.toString()}`);
    if (!response.ok) {
      const errorText = await response.text();
      return {
        statusCode: response.status,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
        },
        body: JSON.stringify({ error: `SAM.gov API error: ${errorText}` }),
      };
    }

    const data = await response.json();
    const opportunities = Array.isArray(data?.opportunitiesData)
      ? data.opportunitiesData
      : [];
    const transformedContracts = [];
    let geocodingCallsMade = 0;

    for (const opportunity of opportunities) {
      const city = opportunity.placeOfPerformance?.city?.name || null;
      const stateCode = opportunity.placeOfPerformance?.state?.code || null;
      const coords = await geocodeLocation(city, stateCode);
      const cacheHit = city && stateCode && cityCache[stateCode]?.[city];
      if (!cacheHit && city && stateCode) {
        geocodingCallsMade += 1;
        if (geocodingCallsMade % 10 === 0) {
          console.log(`Geocoded ${geocodingCallsMade} cities so far...`);
        }
        await delay(1100);
      }

      const amount = parseAmount(opportunity?.award?.amount);
      const description = opportunity.description
        ? String(opportunity.description).slice(0, 200)
        : opportunity.title || "";
      transformedContracts.push({
        id:
          opportunity.noticeId ||
          `sam_${opportunity.solicitationNumber || Math.random().toString(36).slice(2, 8)}`,
        title: opportunity.title || "Untitled opportunity",
        value: formatCurrency(amount),
        dueDate: opportunity.responseDeadLine || "N/A",
        location: buildLocation(opportunity.placeOfPerformance),
        lat: coords.lat,
        lng: coords.lng,
        agency: buildAgency(opportunity.department, opportunity.subtier, opportunity.office),
        category: categorizeContract(opportunity.naicsCode || opportunity.classificationCode),
        contactEmail: getContactEmail(opportunity.pointOfContact),
        description,
        source: "SAM.gov",
        postedDate: opportunity.postedDate || null,
        url: opportunity.uiLink || opportunity.additionalInfoLink || "https://sam.gov",
      });
    }

    console.log(
      `Total contracts: ${transformedContracts.length}, API calls made: ${geocodingCallsMade}`
    );

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify({ opportunities: transformedContracts }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify({ error: error.message || "Unknown error." }),
    };
  }
};
