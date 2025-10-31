import { GenerateRequest, GenerateResponse, JiraIssue } from './types'

const API_BASE_URL = '/api'

export async function fetchJiraIssue(jiraId: string): Promise<JiraIssue> {
  try {
    const response = await fetch(`${API_BASE_URL}/jira/${jiraId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    const data: JiraIssue = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching JIRA issue:', error)
    throw error instanceof Error ? error : new Error('Unknown error occurred')
  }
}

export async function generateTests(request: GenerateRequest): Promise<GenerateResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-tests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    const data: GenerateResponse = await response.json()
    return data
  } catch (error) {
    console.error('Error generating tests:', error)
    throw error instanceof Error ? error : new Error('Unknown error occurred')
  }
}