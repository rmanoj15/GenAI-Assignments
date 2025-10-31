export interface GenerateRequest {
  storyTitle: string
  acceptanceCriteria: string
  description?: string
  additionalInfo?: string
}

export interface TestCase {
  id: string
  title: string
  steps: string[]
  testData?: string
  expectedResult: string
  category: string
}

export type GenerateResponse = {
  cases: TestCase[]
  model?: string
  promptTokens?: number
  completionTokens?: number
}

export type JiraIssue = {
  id: string
  key: string
  summary: string
  description: string
  status: string
  acceptanceCriteria: string
}