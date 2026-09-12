export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
  label: string
  confidence: number
}

export interface ExtractedFields {
  name?: string | null
  date_of_birth?: string | null
  document_number?: string | null
  address?: string | null
  nationality?: string | null
  expiry_date?: string | null
  mrz_line1?: string | null
  mrz_line2?: string | null
  field_confidences?: Record<string, number>
}

export interface EvidenceItem {
  id: string
  label: string
  description: string
  score_contribution: number
  region?: number[] | null
  category: string
}

export interface RiskAssessment {
  risk_score: number
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNABLE TO VERIFY'
  status: string
  unable_to_verify_reason?: string | null
  recommended_action?: string | null
  evidence: EvidenceItem[]
  weights_used: Record<string, number>
}

export interface FaceVerificationResult {
  similarity_score: number
  verdict: string
  score_contribution: number
  confidence_score?: number
  heatmap_image?: string | null
  aligned_doc_face?: string | null
  aligned_selfie_face?: string | null
  quality_checks?: Record<string, any>
}

export interface DocumentAnalysisResult {
  verification_id: string
  document_id: string
  document_type: string
  doc_type_confidence?: number
  image_quality: 'GOOD' | 'FAIR' | 'POOR'
  ocr_confidence: number
  document_assessment: string
  regions: BoundingBox[]
  extracted_fields: ExtractedFields
  forensic_indicators: Array<{
    indicator: string
    description: string
    confidence: number
    region?: number[] | null
    score_contribution: number
  }>
  validation_results: Array<{
    check: string
    passed: boolean
    message: string
    score_contribution: number
  }>
  face_verification?: FaceVerificationResult | null
  risk: RiskAssessment
  doc_image_url?: string | null
  selfie_image_url?: string | null
  encounter_id?: string | null
  demo_scenario?: string | null
  demo_mode: boolean
}

export interface EncounterSummary {
  encounter_id: string
  timestamp: string
  checkpoint: string
  identity_reference: string
  document_reference: string
  face_reference: string
  person_reference: string
  document_type: string
  risk_score: number
  risk_level: string
  status: string
}

export interface DashboardStats {
  checkpoint: string
  encounters_processed: number
  suspicious_encounters: number
  high_risk_encounters: number
  pending_reviews: number
  system_status: string
  demo_data: boolean
}

export interface AuditRecord {
  verification_id: string
  timestamp: string
  document_hash: string
  risk_result: string
  risk_score: number
  evidence_summary: string
  officer_decision: string
  previous_hash: string
  current_hash: string
  encounter_id?: string | null
  document_type?: string
  face_similarity_score?: number
  document_url?: string | null
  selfie_url?: string | null
  officer_id?: string
}

export interface TimelineEntry {
  timestamp: string
  checkpoint: string
  identity_reference: string
  person_reference: string
  risk_level: string
  encounter_id: string
}

export interface IdentityTimeline {
  identity_reference: string
  entries: TimelineEntry[]
  alerts: string[]
}

export interface GraphNode {
  id: string
  label: string
  type: string
  suspicious?: boolean
}

export interface GraphEdge {
  source: string
  target: string
  label: string
  suspicious?: boolean
}

export interface IdentityGraph {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface FraudPattern {
  pattern_id: string
  observed_in: string[]
  common_indicators: string[]
  description: string
}
