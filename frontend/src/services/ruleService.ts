export interface RuleItem {
  _id: string;
  rule_id: string;
  rule_reference: string;
  declaration_type: string;
  requirement_description: string;
  human_condition_text: string;
  package_context: string;
  commodity_category: string;
  applicability_conditions: string;
  mandatory_status: 'MANDATORY' | 'CONDITIONAL' | 'NOT_APPLICABLE' | 'OPTIONAL' | 'REQUIRES_INSPECTOR_REVIEW';
  evidence_type: string;
  ocr_field: string | null;
  validation_function: string;
  imported_status: string | null;
  quantity_condition: string | null;
  package_structure_condition: string | null;
  exemption_exception: string | null;
  effective_from: string | null;
  effective_to: string | null;
  amendment_version: string | null;
  source_document: string;
  source_section: string;
  source_page: number | null;
  source_url: string;
  inspector_review_required: boolean;
  rule_status: 'ACTIVE' | 'FUTURE' | 'HISTORICAL' | 'REVIEW_REQUIRED' | 'INACTIVE';
  rule_family: string;
  notes: string | null;
  database_version: string;
  baseline_origin: string;
  createdAt: string;
  updatedAt: string;
}

export interface RuleStatistics {
  totalRules: number;
  activeRules: number;
  reviewRequiredRules: number;
  futureRules: number;
  historicalGuards: number;
  databaseVersion: string;
  baselineOrigin: string;
  families: { family: string; count: number }[];
}

export interface RuleEvaluationItem {
  rule_id: string;
  rule_reference: string;
  declaration_type: string;
  requirement_description: string;
  rule_family: string;
  applicability_status: 'APPLICABLE' | 'NOT_APPLICABLE' | 'CONDITIONAL' | 'REVIEW_REQUIRED' | 'INSUFFICIENT_DATA' | 'ACTIVE' | 'INACTIVE';
  mandatory_status: string;
  observation_status: 'OBSERVED' | 'NOT_OBSERVED' | 'UNCLEAR' | 'LOW_CONFIDENCE' | 'NOT_ANALYZED';
  observed_value: string | null;
  normalized_value: string | null;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | null;
  evidence_image_ids: string[];
  evidence_descriptions: string[];
  reason: string;
  applicability_explanation: string;
  validation_result: 'PASS' | 'POTENTIAL_VIOLATION' | 'EXEMPT' | 'SCOPE_EXCLUDED' | 'REVIEW_REQUIRED' | 'NOT_APPLICABLE';
  requires_inspector_review: boolean;
  rule_database_version: string;
  amendment_version: string | null;
  effective_from: string | null;
  effective_to: string | null;
}

export interface RuleEvaluationData {
  _id: string;
  evaluation_id: string;
  inspectionId: string;
  sampleId: string;
  sampleCode: string;
  package_context: string;
  commodity: string;
  commodity_category: string;
  rule_database_version: string;
  rules_evaluated: RuleEvaluationItem[];
  summary: {
    total_rules_evaluated: number;
    applicable_count: number;
    mandatory_count: number;
    not_applicable_count: number;
    conditional_count: number;
    review_required_count: number;
    observed_count: number;
    not_observed_count: number;
    potential_violations_count: number;
  };
  evaluated_at: string;
  evaluated_by: string;
}

interface CacheRecord<T> {
  data: T;
  timestamp: number;
}

const ruleClientCache = new Map<string, CacheRecord<any>>();
const RULE_CACHE_TTL = 60 * 1000; // 60 seconds

export function clearRuleClientCache(): void {
  ruleClientCache.clear();
}

export async function fetchRules(
  filters?: {
    status?: string;
    family?: string;
    context?: string;
    search?: string;
  },
  forceRefresh: boolean = false
): Promise<RuleItem[]> {
  const cacheKey = `rules:${JSON.stringify(filters || {})}`;
  if (!forceRefresh) {
    const cached = ruleClientCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < RULE_CACHE_TTL) {
      return cached.data;
    }
  }

  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.family) params.append('family', filters.family);
  if (filters?.context) params.append('context', filters.context);
  if (filters?.search) params.append('search', filters.search);

  const queryStr = params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(`/api/rules${queryStr}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch statutory rules');
  }

  const json = await response.json();
  const rules = json.rules || [];
  ruleClientCache.set(cacheKey, { data: rules, timestamp: Date.now() });
  return rules;
}

export async function fetchRuleStatistics(forceRefresh: boolean = false): Promise<RuleStatistics> {
  const cacheKey = 'rules:statistics';
  if (!forceRefresh) {
    const cached = ruleClientCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < RULE_CACHE_TTL) {
      return cached.data;
    }
  }

  const response = await fetch('/api/rules/summary/statistics', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch rule statistics');
  }

  const json = await response.json();
  ruleClientCache.set(cacheKey, { data: json.statistics, timestamp: Date.now() });
  return json.statistics;
}

export async function fetchRuleById(ruleId: string): Promise<RuleItem> {
  const response = await fetch(`/api/rules/${ruleId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch rule details');
  }

  const json = await response.json();
  return json.rule;
}

export async function updateRuleStatus(
  ruleId: string,
  status: string,
  notes?: string
): Promise<RuleItem> {
  const response = await fetch(`/api/rules/${ruleId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ status, notes }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update rule status');
  }

  const json = await response.json();
  clearRuleClientCache();
  return json.rule;
}

export async function evaluateSampleRules(sampleId: string): Promise<RuleEvaluationData> {
  const response = await fetch(`/api/rule-engine/evaluate/${sampleId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to evaluate sample rules');
  }

  const json = await response.json();
  return json.evaluation;
}

export async function fetchSampleEvaluations(sampleId: string): Promise<{
  latestEvaluation: RuleEvaluationData | null;
  evaluations: RuleEvaluationData[];
}> {
  const response = await fetch(`/api/rule-engine/samples/${sampleId}/evaluations`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to retrieve sample evaluations');
  }

  const json = await response.json();
  return {
    latestEvaluation: json.latestEvaluation || null,
    evaluations: json.evaluations || [],
  };
}

