
// Manufacturer Matching Service
// Only manufacturers that support BOTH the required process
// and material are eligible for a match.

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

const terminology = {
  plastic: ['plastic', 'plastics'],
  'injection molding': [
    'injection molding',
    'injection moulding',
  ],
};

function canonicalize(value) {
  const normalized = normalize(value);

  for (const [canonical, alternatives] of Object.entries(terminology)) {
    if (alternatives.map(normalize).includes(normalized)) {
      return canonical;
    }
  }

  return normalized;
}

// Normalize specific stainless-steel grades to their material family.
// This does not treat ordinary steel as stainless steel.
function canonicalizeMaterial(value) {
  const normalized = canonicalize(value);

  // Treat PP and polypropylene, including food-grade PP, as equivalent.
  if (/\b(pp|polypropylene)\b/.test(normalized)) {
    return 'polypropylene';
  }

  // Normalize stainless-steel grades without accepting ordinary steel.
  if (/\b(stainless steel|stainless)\b/.test(normalized)) {
    return 'stainless steel';
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

function materialsCompatible(projectMaterial, manufacturerMaterials = []) {
  const project = canonicalizeMaterial(projectMaterial);

  if (!project || !Array.isArray(manufacturerMaterials)) {
    return false;
  }

  return manufacturerMaterials.some((material) => {
    const manufacturerMaterial = canonicalizeMaterial(material);

    return Boolean(
      manufacturerMaterial &&
      manufacturerMaterial === project
    );
  });
}

function productCapabilityMatches(project, manufacturer) {
  // These are explicit equivalent category terms, not substring matches.
  const categoryGroups = {
    'smart devices': [
      'smart devices',
      'consumer electronics',
    ],
    'consumer electronics': [
      'smart devices',
      'consumer electronics',
    ],
    'bottles drinkware': [
      'bottles drinkware',
      'bottles',
      'drinkware',
      'water bottles',
      'beverage containers',
      'plastic bottles',
      'drink containers',
    ],
    'plastic products': [
      'plastic products',
      'plastic components',
      'custom plastic parts',
      'plastic parts',
    ],
    'industrial components': [
      'industrial components',
      'precision cnc components',
      'machine components',
    ],
    'automotive products': [
      'automotive products',
      'automotive components',
      'automotive parts',
      'auto parts',
    ],
    'laboratory equipment': [
      'laboratory equipment',
      'laboratory instruments',
      'laboratory instruments and thermometers',
      'lab equipment',
      'thermometers',
    ],
  };

  const projectCategories = (
    Array.isArray(project.productCategories) &&
    project.productCategories.length
      ? project.productCategories
      : project.productCategory
        ? [project.productCategory]
        : []
  )
    .map(normalize)
    .filter((category) => category && category !== 'other');

  const manufacturerTerms = [
    ...(manufacturer.productCategories || []),
    ...(manufacturer.capabilities || []),
  ]
    .map(normalize)
    .filter(Boolean);

  if (!projectCategories.length) {
    return false;
  }

  return projectCategories.some((projectCategory) => {
    const acceptedTerms = categoryGroups[projectCategory] || [
      projectCategory,
    ];

    return manufacturerTerms.some((manufacturerTerm) =>
      acceptedTerms.some(
        (acceptedTerm) =>
          manufacturerTerm === normalize(acceptedTerm)
      )
    );
  });
}

function calculateManufacturerMatch(project, manufacturer) {
  const reasons = [];
  const missing = [];

  const scoreBreakdown = {
    manufacturingProcess: 0,
    materialCompatibility: 0,
    productCapability: 0,
    orderQuantity: 0,
    verificationStatus: 0,
  };

  const processMatch = matchesArray(
    project.process,
    manufacturer.manufacturingProcesses
  );

  const materialMatch = materialsCompatible(
    project.material,
    manufacturer.materials
  );

  // Mandatory compatibility requirements.
  if (!project.process) {
    missing.push('Project manufacturing process is not specified');
  } else if (processMatch) {
    reasons.push('Manufacturing process supported');
  } else {
    missing.push('Required manufacturing process is not supported');
  }

  if (!project.material) {
    missing.push('Project material is not specified');
  } else if (materialMatch) {
    reasons.push('Material compatibility confirmed');
  } else {
    missing.push('Required material is not supported');
  }

  // Incompatible manufacturers cannot earn a recommendation score.
  if (!processMatch || !materialMatch) {
    return {
      manufacturerId: manufacturer._id,
      companyName: manufacturer.companyName,
      country: manufacturer.country,
      city: manufacturer.city,
      website: manufacturer.website,
      contactEmail: manufacturer.contactEmail,
      verificationStatus: manufacturer.verificationStatus,
      manufacturingProcesses: manufacturer.manufacturingProcesses || [],
      materials: manufacturer.materials || [],
      productCategories: manufacturer.productCategories || [],
      capabilities: manufacturer.capabilities || [],
      minimumOrderQuantity: manufacturer.minimumOrderQuantity ?? null,
      smallOrderResponsiveness: manufacturer.smallOrderResponsiveness || 'Unknown',
      eligible: false,
      matchScore: 0,
      scoreBreakdown,
      reasons,
      missing,
    };
  }

  // Mandatory requirements passed.
  scoreBreakdown.manufacturingProcess = 30;
  scoreBreakdown.materialCompatibility = 25;

  // 3. Product category or capability: 20 points.
  if (productCapabilityMatches(project, manufacturer)) {
    scoreBreakdown.productCapability = 20;
    reasons.push('Manufacturer supports the product category');
  } else {
    missing.push('Product category or capability not confirmed');
  }

  // 4. Order quantity: 15 points.
  const minimumOrder = manufacturer.minimumOrderQuantity;

  if (
    typeof minimumOrder === 'number' &&
    Number.isFinite(minimumOrder) &&
    minimumOrder > 0
  ) {
    if (project.quantity >= minimumOrder) {
      scoreBreakdown.orderQuantity = 15;
      reasons.push('Order quantity meets manufacturer minimum');
    } else {
      missing.push('Order quantity is below manufacturer minimum');
    }
  } else {
    scoreBreakdown.orderQuantity = 0;
    missing.push('Manufacturer minimum order quantity is unknown');
  }

  // 5. Verification: 10 points.
  if (manufacturer.verificationStatus === 'Verified') {
    scoreBreakdown.verificationStatus = 10;
    reasons.push('Manufacturer is verified');
  } else if (manufacturer.verificationStatus === 'Under Review') {
    scoreBreakdown.verificationStatus = 5;
    reasons.push('Manufacturer verification is under review');
  } else {
    missing.push('Manufacturer is not yet verified');
  }

  const score = Object.values(scoreBreakdown).reduce(
    (total, points) => total + points,
    0
  );

  return {
    manufacturerId: manufacturer._id,
    companyName: manufacturer.companyName,
    country: manufacturer.country,
    city: manufacturer.city,
    website: manufacturer.website,
    contactEmail: manufacturer.contactEmail,
    verificationStatus: manufacturer.verificationStatus,
    manufacturingProcesses: manufacturer.manufacturingProcesses || [],
    materials: manufacturer.materials || [],
    productCategories: manufacturer.productCategories || [],
    capabilities: manufacturer.capabilities || [],
    minimumOrderQuantity: manufacturer.minimumOrderQuantity ?? null,
    smallOrderResponsiveness: manufacturer.smallOrderResponsiveness || 'Unknown',
    eligible: true,
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
    .filter((match) => match.eligible)
    .sort((a, b) => b.matchScore - a.matchScore);
}

// Return both compatible recommendations and compatibility diagnostics.
// Incompatible manufacturers are diagnostic only and must not be recommended.
function analyzeManufacturerMatches(project, manufacturers) {
  const results = manufacturers.map((manufacturer) =>
    calculateManufacturerMatch(project, manufacturer)
  );

  return {
    matches: results
      .filter((match) => match.eligible)
      .sort((a, b) => b.matchScore - a.matchScore),
    incompatible: results.filter((match) => !match.eligible),
  };
}

module.exports = {
  calculateManufacturerMatch,
  findManufacturerMatches,
  analyzeManufacturerMatches,
};
