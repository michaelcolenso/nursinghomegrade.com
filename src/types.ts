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
}

// Stored in D1
export interface Facility {
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

// Cloudflare Worker environment bindings
export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
}
