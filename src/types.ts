// Raw shape returned by CMS API
export interface CMSFacility {
  cms_certification_number_ccn: string;
  provider_name: string;
  provider_address: string;
  citytown: string;
  state: string;
  zip_code: string;
  latitude: string;
  longitude: string;
  overall_rating: string;
  qm_rating: string;
  staffing_rating: string;
  health_inspection_rating: string;
  reported_rn_staffing_hours_per_resident_per_day: string;
  reported_total_nurse_staffing_hours_per_resident_per_day: string;
  rating_cycle_1_total_number_of_health_deficiencies: string;
  total_weighted_health_survey_score: string;
  // Profile and enforcement columns. Optional because older captures of this
  // file predate them; ingest maps a missing column to null, never to a zero.
  telephone_number?: string;
  ownership_type?: string;
  legal_business_name?: string;
  provider_type?: string;
  countyparish?: string;
  number_of_certified_beds?: string;
  average_number_of_residents_per_day?: string;
  date_first_approved_to_provide_medicare_and_medicaid_services?: string;
  special_focus_status?: string;
  abuse_icon?: string;
  number_of_fines?: string;
  total_amount_of_fines_in_dollars?: string;
  number_of_payment_denials?: string;
  total_number_of_penalties?: string;
  rating_cycle_1_standard_survey_health_date?: string;
  registered_nurse_turnover?: string;
  total_nursing_staff_turnover?: string;
  processing_date?: string;
}

export type GradeCompleteness = "complete" | "partial" | "insufficient";

/**
 * Profile fields carried verbatim from the CMS Provider Information file.
 */
export interface FacilityProfile {
  phone?: string | null;
  ownership_type?: string | null;
  legal_business_name?: string | null;
  provider_type?: string | null;
  county?: string | null;
  certified_beds?: number | null;
  avg_residents_per_day?: number | null;
  certification_date?: string | null;
  special_focus_status?: string | null;
  abuse_icon?: string | null;
  number_of_fines?: number | null;
  total_fines_dollars?: number | null;
  number_of_payment_denials?: number | null;
  total_penalties?: number | null;
  latest_standard_survey_date?: string | null;
  rn_turnover_pct?: number | null;
  total_nursing_turnover_pct?: number | null;
  cms_processing_date?: string | null;
}

/** One enforcement action from the CMS Penalties file. */
export interface FacilityPenalty {
  id: number;
  cms_id: string;
  penalty_date: string | null;
  penalty_type: string | null;
  fine_amount: number | null;
  payment_denial_start_date: string | null;
  payment_denial_length_days: number | null;
  processing_date: string | null;
}

// Stored in D1
export interface Facility extends FacilityProfile {
  cms_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude: number | null;
  longitude: number | null;
  overall_rating: number | null;
  quality_rating: number | null;
  staffing_rating: number | null;
  inspection_rating: number | null;
  rn_hours_per_resident_day: number | null;
  total_deficiencies: number | null;
  /** -1 only for persisted legacy-schema compatibility when grade is withheld. */
  grade_score: number;
  /** A/B/C/D/F, or NR when required evidence is insufficient. */
  grade_letter: string;
  grade_summary: string;
  grade_completeness?: GradeCompleteness;
  /** Comma-separated machine keys for unavailable score inputs. */
  grade_missing_inputs?: string | null;
  slug: string;
  updated_at: string;
}

export interface StateFacilityCard {
  cms_id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  grade_score: number;
  grade_letter: string;
  rn_hours_per_resident_day: number | null;
}

export interface FacilityInspectionDetails {
  complaint_deficiencies_cycle_1: number | null;
}

export type FacilityPageData = Facility & FacilityInspectionDetails;

export interface Deficiency {
  id: number;
  cms_id: string;
  survey_date: string | null;
  deficiency_category: string | null;
  deficiency_tag_number: string | null;
  deficiency_description: string | null;
  scope_severity_code: string | null;
  deficiency_corrected: string | null;
  correction_date: string | null;
  inspection_cycle: number | null;
  standard_deficiency: string | null;
  complaint_deficiency: string | null;
}

// Stored in facility_snapshots table
export interface FacilitySnapshot {
  cms_id: string;
  snapshot_date: string;
  overall_rating: number | null;
  quality_rating: number | null;
  staffing_rating: number | null;
  inspection_rating: number | null;
  rn_hours_per_resident_day: number | null;
  total_deficiencies: number | null;
  grade_score: number;
  grade_letter: string;
}

export interface Operator {
  id: number;
  normalized_name: string;
  slug: string;
  facility_count: number;
  avg_grade: number | null;
  avg_staffing_score: number | null;
  avg_deficiency_score: number | null;
  avg_penalty_score: number | null;
  operator_score: number | null;
  operator_tier: string | null;
}

export interface FacilityOwner {
  id: number;
  cms_id: string;
  raw_name: string;
  normalized_name: string;
  owner_type: string | null;
  role: string | null;
  ownership_percentage: string | null;
}

export type TrajectoryStatus = "improving" | "stable" | "declining" | "volatile" | "insufficient_history";

export interface Trajectory {
  cms_id: string;
  status: TrajectoryStatus;
  staffing_change_pct: number | null;
  deficiency_change_pct: number | null;
  grade_change: number | null;
  rn_hours_trend: "up" | "down" | "flat" | null;
}

// ── Grade 2.0 Phase A evidence ──────────────────────────────────────────────

export interface Grade2StaffingEvidence {
  cms_id: string;
  reported_total_nurse_hprd: number | null;
  weekend_total_nurse_hprd: number | null;
  weekend_rn_hprd: number | null;
  rn_turnover_pct: number | null;
  total_nursing_turnover_pct: number | null;
  administrators_left: number | null;
  nursing_case_mix_index: number | null;
  nursing_case_mix_index_ratio: number | null;
  case_mix_rn_hprd: number | null;
  case_mix_total_nurse_hprd: number | null;
  case_mix_weekend_total_nurse_hprd: number | null;
  adjusted_rn_hprd: number | null;
  adjusted_total_nurse_hprd: number | null;
  adjusted_weekend_total_nurse_hprd: number | null;
  processing_date: string | null;
}

export interface Grade2SurveySummary {
  cms_id: string;
  inspection_cycle: number;
  health_survey_date: string | null;
  fire_safety_survey_date: string | null;
  total_health_deficiencies: number | null;
  total_fire_safety_deficiencies: number | null;
  infection_control_deficiencies: number | null;
  processing_date: string | null;
}

export interface Grade2QualityMeasure {
  cms_id: string;
  measure_code: string;
  measure_description: string | null;
  resident_type: string | null;
  score: number | null;
  observed_score?: number | null;
  expected_score?: number | null;
  footnote: string | null;
  used_in_five_star: string | null;
  measure_period: string | null;
  processing_date: string | null;
}

// Cloudflare Worker environment bindings
export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  AI_SEARCH: AiSearchInstance;
}
