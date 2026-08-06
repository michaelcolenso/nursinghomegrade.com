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

/**
 * Profile fields carried verbatim from the CMS Provider Information file.
 *
 * Every property is optional AND nullable, and the two mean different things:
 * absent = the column has not been added/populated in this environment yet,
 * null = CMS publishes no value for this facility. Templates treat both the
 * same way — render nothing — so a page never implies data it does not hold.
 *
 * There is no email field because the federal source files contain none.
 */
export interface FacilityProfile {
  /** Digits as CMS publishes them, e.g. "9198518000". Formatted at render time. */
  phone?: string | null;
  /** e.g. "For profit - Corporation", "Government - County", "Non profit - Church related". */
  ownership_type?: string | null;
  legal_business_name?: string | null;
  /** e.g. "Medicare and Medicaid". */
  provider_type?: string | null;
  county?: string | null;
  certified_beds?: number | null;
  avg_residents_per_day?: number | null;
  /** Date first approved to provide Medicare and Medicaid services. */
  certification_date?: string | null;
  /** "SFF" or "SFF Candidate" when CMS flags the facility; empty otherwise. */
  special_focus_status?: string | null;
  /** "Y" when CMS displays the abuse icon for this facility. */
  abuse_icon?: string | null;
  number_of_fines?: number | null;
  total_fines_dollars?: number | null;
  number_of_payment_denials?: number | null;
  total_penalties?: number | null;
  /** Date of the most recent standard health survey (rating cycle 1). */
  latest_standard_survey_date?: string | null;
  rn_turnover_pct?: number | null;
  total_nursing_turnover_pct?: number | null;
  /** CMS processing date for the source file — the vintage of everything above. */
  cms_processing_date?: string | null;
}

/** One enforcement action from the CMS Penalties file. */
export interface FacilityPenalty {
  id: number;
  cms_id: string;
  penalty_date: string | null;
  /** "Fine" or "Payment Denial". */
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
  grade_score: number;
  grade_letter: string;
  grade_summary: string;
  slug: string;
  updated_at: string;
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

// Cloudflare Worker environment bindings
export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
}
