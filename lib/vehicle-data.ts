// Vehicle data utilities for AUCT companies and models

export interface Company {
  company_id: number;
  name: string;
  country: string;
}

export interface Model {
  model_id: number;
  name: string;
  company_ref: number;
}

let companiesCache: Company[] | null = null;
let modelsCache: Model[] | null = null;

// Parse CSV line (handles quoted fields)
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Load companies from CSV
export async function loadCompanies(): Promise<Company[]> {
  if (companiesCache) return companiesCache;

  try {
    const response = await fetch("/data/auct_companies.csv");
    const text = await response.text();
    const lines = text.split("\n").filter((line) => line.trim());
    const companies: Company[] = [];

    // Skip header
    for (let i = 1; i < lines.length; i++) {
      const parts = parseCSVLine(lines[i]);
      if (parts.length >= 3) {
        companies.push({
          company_id: parseInt(parts[0], 10),
          name: parts[1],
          country: parts[2],
        });
      }
    }

    companiesCache = companies;
    return companies;
  } catch (error) {
    console.error("Error loading companies:", error);
    return [];
  }
}

// Load models from CSV
export async function loadModels(): Promise<Model[]> {
  if (modelsCache) return modelsCache;

  try {
    const response = await fetch("/data/auct_models.csv");
    const text = await response.text();
    const lines = text.split("\n").filter((line) => line.trim());
    const models: Model[] = [];

    // Skip header
    for (let i = 1; i < lines.length; i++) {
      const parts = parseCSVLine(lines[i]);
      if (parts.length >= 3) {
        models.push({
          model_id: parseInt(parts[0], 10),
          name: parts[1],
          company_ref: parseInt(parts[2], 10),
        });
      }
    }

    modelsCache = models;
    return models;
  } catch (error) {
    console.error("Error loading models:", error);
    return [];
  }
}

// Get companies grouped by country (Japan first, then alphabetical)
export async function getCompaniesByCountry(): Promise<
  { country: string; companies: Company[] }[]
> {
  const companies = await loadCompanies();
  const grouped = new Map<string, Company[]>();

  for (const company of companies) {
    const country = company.country || "OTHER";
    if (!grouped.has(country)) {
      grouped.set(country, []);
    }
    grouped.get(country)!.push(company);
  }

  // Sort companies within each country
  for (const [country, companyList] of grouped.entries()) {
    companyList.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Get all countries, put Japan first
  const allCountries = Array.from(grouped.keys());
  const japanIndex = allCountries.indexOf("JAPAN");
  if (japanIndex > -1) {
    allCountries.splice(japanIndex, 1);
    allCountries.sort();
    allCountries.unshift("JAPAN");
  } else {
    allCountries.sort();
  }

  return allCountries.map((country) => ({
    country,
    companies: grouped.get(country)!,
  }));
}

// Get models for a specific company
export async function getModelsByCompany(
  companyId: number
): Promise<Model[]> {
  const models = await loadModels();
  return models
    .filter((model) => model.company_ref === companyId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Get company by ID
export async function getCompanyById(companyId: number): Promise<Company | null> {
  const companies = await loadCompanies();
  return companies.find((c) => c.company_id === companyId) || null;
}

// Get model by ID
export async function getModelById(modelId: number): Promise<Model | null> {
  const models = await loadModels();
  return models.find((m) => m.model_id === modelId) || null;
}
