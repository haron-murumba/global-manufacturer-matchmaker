
// Manufacturer Matching Service
// Compares projects with manufacturers using normalized terminology.

function normalize(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/moulding/g, 'molding')
    .replace(/moulded/g, 'molded')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Recognized equivalent manufacturing terms
const terminology = {
  plastic: ['plastic', 'plastics'],
  'injection molding': [
    'injection molding',
    'injection moulding',
  ],
};

// Convert recognized equivalent terms to a shared value
function canonicalize(value) {
  const normalized = normalize(value);

  for (const [canonical, alternatives] of Object.entries(terminology)) {
    if (alternatives.map(normalize).includes(normalized)) {
      return canonical;
    }
  }

  return normalized;
}

function matchesArray(projectValue, manufacturerValues = []) {
  const project = canonicalize(projectValue);

  if (!project || !Array.isArray(manufacturerValues)) {
    return false;
  }

  return manufacturerValues.some(
    (value) => canonicalize(value) === project
  );
}

// Controlled material compatibility
function materialsCompatible(projectMaterial, manufacturerMaterials = []) {
  const project = canonicalize(projectMaterial);

  if (!project || !Array.isArray(manufacturerMaterials)) {
    return false;
  }

  return manufacturerMaterials.some((material) => {
    const manufacturerMaterial = canonicalize(material);

    if (!manufacturerMaterial) return false;

    if (manufacturerMaterial === project) return true;

    // Related materials are not automatically treated as equivalent.
    const materialFamilies = {
      plastic: ['plastics', 'polymers', 'abs plastic'],
      steel: ['stainless steel', 'carbon steel'],
    };

    const related = materialFamilies[project] || [];

    return related.includes(manufacturerMaterial);
  });
}

function calculateManufacturerMatch(project, manufacturer) {
  let score = 0;
  const reasons = [];
  const missing = [];

  const scoreBreakdown = {
    manufacturingProcess: 0,
    materialCompatibility: 0,
    productCapability: 0,
    orderQuantity: 0,
    verificationStatus: 0,
  };

  // 1. Manufacturing process: 30 points
  if (
    matchesArray(
      project.process,
      manufacturer.manufacturingProcesses
    )
  ) {
    scoreBreakdown.manufacturingProcess = 30;
    score += 30;
    reasons.push('Manufacturing process supported');
  } else {
    missing.push('Manufacturing process not confirmed');
  }

  // 2. Material compatibility: 25 points
  if (materialsCompatible(project.material, manufacturer.materials)) {
    scoreBreakdown.materialCompatibility = 25;
    score += 25;
    reasons.push('Material compatibility confirmed');
  } else {
    missing.push('Material compatibility not confirmed');
  }

  // 3. Product category or capability: 20 points
  const productName = normalize(project.productName);

  const categories = (manufacturer.productCategories || [])
    .map(normalize)
    .filter(Boolean);

  const capabilities = (manufacturer.capabilities || [])
    .map(normalize)
    .filter(Boolean);

  const categoryMatch = categories.some(
    (category) =>
      productName.includes(category) ||
      category.includes(productName)
  );

  const capabilityMatch = capabilities.some(
    (capability) =>
      productName.includes(capability) ||
      capability.includes(productName)
  );

  if (productName && (categoryMatch || capabilityMatch)) {
    scoreBreakdown.productCapability = 20;
    score += 20;
    reasons.push('Product category or capability matches');
  } else {
    missing.push('Product capability not confirmed');
  }

  // 4. Order quantity: 15 points
  const minimumOrder = manufacturer.minimumOrderQuantity;

  if (
    typeof minimumOrder === 'number' &&
    Number.isFinite(minimumOrder) &&
    minimumOrder > 0
  ) {
    if (project.quantity >= minimumOrder) {
      scoreBreakdown.orderQuantity = 15;
      score += 15;
      reasons.push('Order quantity meets minimum requirements');
    } else {
      missing.push('Order quantity is below manufacturer minimum');
    }
  } else {
    scoreBreakdown.orderQuantity = 7.5;
    score += 7.5;
    missing.push('Manufacturer minimum order quantity is unknown');
  }

  // 5. Verification: 10 points
  if (manufacturer.verificationStatus === 'Verified') {
    scoreBreakdown.verificationStatus = 10;
    score += 10;
    reasons.push('Manufacturer is verified');
  } else if (manufacturer.verificationStatus === 'Under Review') {
    scoreBreakdown.verificationStatus = 5;
    score += 5;
    reasons.push('Manufacturer verification is under review');
  } else {
    missing.push('Manufacturer is not yet verified');
  }

  return {
    manufacturerId: manufacturer._id,
    companyName: manufacturer.companyName,
    country: manufacturer.country,
    city: manufacturer.city,
    website: manufacturer.website,
    contactEmail: manufacturer.contactEmail,
    verificationStatus: manufacturer.verificationStatus,
    matchScore: score,
    scoreBreakdown,
    reasons,
    missing,
  };
}

function findManufacturerMatches(project, manufacturers) {
  return manufacturers
    .map((manufacturer) =>
      calculateManufacturerMatch(project, manufacturer)
    )
    .sort((a, b) => b.matchScore - a.matchScore);
}

module.exports = {
  calculateManufacturerMatch,
  findManufacturerMatches,
};
