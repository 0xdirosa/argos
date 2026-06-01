import type { AnalysisResult } from './reasoner'

export type ValidationResult = {
  valid: boolean
  reason?: string
}

const REQUIRED_KEYS: (keyof AnalysisResult)[] = [
  'findings',
  'riskScore',
  'confidence',
  'summary',
]

export function validateResult(result: AnalysisResult): ValidationResult {
  for (const key of REQUIRED_KEYS) {
    if (result[key] === undefined || result[key] === null) {
      return { valid: false, reason: `Missing required field: ${key}` }
    }
  }

  if (!Array.isArray(result.findings)) {
    return { valid: false, reason: 'findings must be an array' }
  }

  if (result.findings.length === 0) {
    return { valid: false, reason: 'findings array is empty — no analysis produced' }
  }

  if (typeof result.confidence !== 'number') {
    return { valid: false, reason: 'confidence must be a number' }
  }

  if (result.confidence < 60) {
    return { valid: false, reason: `confidence too low (${result.confidence}) — minimum 60 required` }
  }

  if (result.confidence > 100) {
    return { valid: false, reason: `confidence exceeds 100 (${result.confidence})` }
  }

  if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(result.riskScore)) {
    return { valid: false, reason: `invalid riskScore: ${result.riskScore}` }
  }

  if (typeof result.summary !== 'string' || result.summary.trim().length < 10) {
    return { valid: false, reason: 'summary too short or missing' }
  }

  return { valid: true }
}
