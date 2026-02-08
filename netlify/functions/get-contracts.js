// Netlify Function: Fetch and transform SAM.gov opportunities.
// TODO: Replace with a secure backend service if needed.

const SAM_API_URL = "https://api.sam.gov/opportunities/v2/search";
const STATE_CENTERS = {
  TX: { lat: 31.0, lng: -99.9 },
};

function formatDate(date) {
  return date.toISOString().split("T")[0];
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
    return null;
  }
  return `$${amount.toLocaleString("en-US")}`;
}

function deriveCategory(naicsCode, classificationCode) {
  const naics = String(naicsCode || "");
  const classification = String(classificationCode || "");

  // Simple mapping for now. TODO: Expand NAICS/category mapping.
  if (naics.startsWith("2373") || classification.startsWith("Y1")) {
    return "Transportation";
  }
  if (naics.startsWith("2213") || naics.startsWith("221")) {
    return "Water";
  }
  if (naics.startsWith("2211") || naics.startsWith("2212")) {
    return "Energy";
  }
  if (naics.startsWith("23")) {
    return "Municipal";
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

function getCoordinates(placeOfPerformance) {
  const state = placeOfPerformance?.state?.code;
  if (state && STATE_CENTERS[state]) {
    return STATE_CENTERS[state];
  }
  return { lat: null, lng: null };
}

function getContactEmail(pointOfContact) {
  if (!Array.isArray(pointOfContact) || pointOfContact.length === 0) {
    return null;
  }
  return pointOfContact[0]?.email || null;
}

function transformOpportunity(item) {
  const amount = parseAmount(item?.award?.amount);
  const coordinates = getCoordinates(item.placeOfPerformance);
  return {
    id: item.noticeId || `sam_${item.solicitationNumber || Math.random().toString(36).slice(2, 8)}`,
    title: item.title || "Untitled opportunity",
    value: formatCurrency(amount),
    dueDate: item.responseDeadLine || null,
    location: buildLocation(item.placeOfPerformance),
    lat: coordinates.lat, // TODO: Add geocoding for accurate lat/lng.
    lng: coordinates.lng, // TODO: Add geocoding for accurate lat/lng.
    agency: buildAgency(item.department, item.subtier, item.office),
    category: deriveCategory(item.naicsCode, item.classificationCode),
    contactEmail: getContactEmail(item.pointOfContact),
    description: item.description ? String(item.description).slice(0, 200) : item.title || "",
    source: "SAM.gov",
    postedDate: item.postedDate || null,
    url: item.uiLink || item.additionalInfoLink || "https://sam.gov",
  };
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
    const transformed = opportunities.map(transformOpportunity);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify({ opportunities: transformed }),
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
