function normalizeCountryName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const COUNTRY_ALIASES = {
  usa: 'united states',
  'united states of america': 'united states',
  uk: 'united kingdom',
  'great britain': 'united kingdom',
  britain: 'united kingdom',
  'south korea': 'south korea',
  'republic of korea': 'south korea',
  'korea south': 'south korea',
  'north korea': 'north korea',
  'korea north': 'north korea',
  'viet nam': 'vietnam',
  prc: 'china',
  'people s republic of china': 'china',
  uae: 'united arab emirates',
  'russian federation': 'russia',
  'czech republic': 'czechia',
  turkiye: 'turkey',
};

const COUNTRIES_BY_REGION = {
  Africa: [
    'Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi',
    'Cabo Verde', 'Cameroon', 'Central African Republic', 'Chad', 'Comoros',
    'Democratic Republic of the Congo', 'Republic of the Congo', 'Djibouti',
    'Egypt', 'Equatorial Guinea', 'Eritrea', 'Eswatini', 'Ethiopia', 'Gabon',
    'Gambia', 'Ghana', 'Guinea', 'Guinea Bissau', 'Ivory Coast', 'Kenya',
    'Lesotho', 'Liberia', 'Libya', 'Madagascar', 'Malawi', 'Mali',
    'Mauritania', 'Mauritius', 'Morocco', 'Mozambique', 'Namibia', 'Niger',
    'Nigeria', 'Rwanda', 'Sao Tome and Principe', 'Senegal', 'Seychelles',
    'Sierra Leone', 'Somalia', 'South Africa', 'South Sudan', 'Sudan',
    'Tanzania', 'Togo', 'Tunisia', 'Uganda', 'Zambia', 'Zimbabwe',
  ],
  Asia: [
    'Afghanistan', 'Armenia', 'Azerbaijan', 'Bahrain', 'Bangladesh', 'Bhutan',
    'Brunei', 'Cambodia', 'China', 'Cyprus', 'Georgia', 'India', 'Indonesia',
    'Iran', 'Iraq', 'Israel', 'Japan', 'Jordan', 'Kazakhstan', 'Kuwait',
    'Kyrgyzstan', 'Laos', 'Lebanon', 'Malaysia', 'Maldives', 'Mongolia',
    'Myanmar', 'Nepal', 'North Korea', 'Oman', 'Pakistan', 'Palestine',
    'Philippines', 'Qatar', 'Saudi Arabia', 'Singapore', 'South Korea',
    'Sri Lanka', 'Syria', 'Taiwan', 'Tajikistan', 'Thailand', 'Timor Leste',
    'Turkey', 'Turkmenistan', 'United Arab Emirates', 'Uzbekistan', 'Vietnam',
    'Yemen',
  ],
  Europe: [
    'Albania', 'Andorra', 'Austria', 'Belarus', 'Belgium',
    'Bosnia and Herzegovina', 'Bulgaria', 'Croatia', 'Czechia', 'Denmark',
    'Estonia', 'Finland', 'France', 'Germany', 'Greece', 'Hungary', 'Iceland',
    'Ireland', 'Italy', 'Kosovo', 'Latvia', 'Liechtenstein', 'Lithuania',
    'Luxembourg', 'Malta', 'Moldova', 'Monaco', 'Montenegro', 'Netherlands',
    'North Macedonia', 'Norway', 'Poland', 'Portugal', 'Romania', 'Russia',
    'San Marino', 'Serbia', 'Slovakia', 'Slovenia', 'Spain', 'Sweden',
    'Switzerland', 'Ukraine', 'United Kingdom', 'Vatican City',
  ],
  'North America': [
    'Antigua and Barbuda', 'Bahamas', 'Barbados', 'Belize', 'Canada',
    'Costa Rica', 'Cuba', 'Dominica', 'Dominican Republic', 'El Salvador',
    'Grenada', 'Guatemala', 'Haiti', 'Honduras', 'Jamaica', 'Mexico',
    'Nicaragua', 'Panama', 'Saint Kitts and Nevis', 'Saint Lucia',
    'Saint Vincent and the Grenadines', 'Trinidad and Tobago',
    'United States',
  ],
  'South America': [
    'Argentina', 'Bolivia', 'Brazil', 'Chile', 'Colombia', 'Ecuador',
    'Guyana', 'Paraguay', 'Peru', 'Suriname', 'Uruguay', 'Venezuela',
  ],
  Oceania: [
    'Australia', 'Fiji', 'Kiribati', 'Marshall Islands', 'Micronesia',
    'Nauru', 'New Zealand', 'Palau', 'Papua New Guinea', 'Samoa',
    'Solomon Islands', 'Tonga', 'Tuvalu', 'Vanuatu',
  ],
};

function canonicalCountryName(value) {
  const normalized = normalizeCountryName(value);
  return COUNTRY_ALIASES[normalized] || normalized;
}

const COUNTRY_REGION_LOOKUP = Object.fromEntries(
  Object.entries(COUNTRIES_BY_REGION).flatMap(([region, countries]) =>
    countries.map((country) => [canonicalCountryName(country), region])
  )
);

function getCountryRegion(country) {
  return COUNTRY_REGION_LOOKUP[canonicalCountryName(country)] || null;
}

function matchesProjectGeography(project, manufacturer) {
  const preferredCountry = canonicalCountryName(project.preferredCountry);
  const preferredRegion = String(project.preferredRegion || '').trim();

  if (preferredCountry) {
    return canonicalCountryName(manufacturer.country) === preferredCountry;
  }

  if (preferredRegion) {
    return getCountryRegion(manufacturer.country) === preferredRegion;
  }

  return true;
}

module.exports = {
  normalizeCountryName,
  canonicalCountryName,
  getCountryRegion,
  matchesProjectGeography,
};
