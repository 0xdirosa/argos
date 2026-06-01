import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })

export type Finding = {
  title: string
  description: string
  evidence: string
  confidence: number
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

export type AnalysisResult = {
  findings: Finding[]
  riskScore: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  confidence: number
  summary: string
  rawResponse?: string
  error?: string
}

const SYSTEM_PROMPT = `You are Argos, an expert on-chain analysis AI for Arc Testnet.
Analyze the provided on-chain data and produce a structured JSON response.

Follow this chain-of-thought process internally:
1. INSPECT: Examine all data points for patterns, anomalies, and red flags
2. CORRELATE: Cross-reference findings — does one anomaly explain another?
3. EVIDENCE: For each finding, cite specific data points as proof
4. SCORE: Assign confidence (0-100) and severity (LOW/MEDIUM/HIGH/CRITICAL)
5. SYNTHESIZE: Produce a concise summary that connects all findings

Respond ONLY with valid JSON in this exact format (no markdown, no explanation):

{
  "findings": [
    {
      "title": "Short finding title",
      "description": "Detailed explanation of what was found",
      "evidence": "Specific data points that support this finding",
      "confidence": 85,
      "severity": "MEDIUM"
    }
  ],
  "riskScore": "HIGH",
  "confidence": 78,
  "summary": "2-3 sentence synthesis connecting all findings"
}`

export async function reasonAboutData(
  rawData: Record<string, unknown>,
  queryType: string,
): Promise<AnalysisResult> {
  if (!process.env.GROQ_API_KEY) {
    return {
      findings: [],
      riskScore: 'LOW',
      confidence: 0,
      summary: 'GROQ_API_KEY not configured — analysis unavailable',
      error: 'GROQ_API_KEY not set',
    }
  }

  const userPrompt = `Analyze this on-chain data for ${queryType}:

${JSON.stringify(rawData, null, 2)}

Follow the chain-of-thought process: INSPECT → CORRELATE → EVIDENCE → SCORE → SYNTHESIZE.
Return only valid JSON.`

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 2048,
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      return {
        findings: [],
        riskScore: 'LOW',
        confidence: 0,
        summary: 'Empty response from Groq',
        error: 'No content in Groq response',
      }
    }

    const parsed = JSON.parse(content) as AnalysisResult

    if (!Array.isArray(parsed.findings)) {
      parsed.findings = []
    }
    if (typeof parsed.confidence !== 'number') {
      parsed.confidence = 0
    }
    if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(parsed.riskScore)) {
      parsed.riskScore = 'LOW'
    }

    parsed.rawResponse = content
    return parsed
  } catch (err) {
    return {
      findings: [],
      riskScore: 'LOW',
      confidence: 0,
      summary: 'Analysis failed due to an error',
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
