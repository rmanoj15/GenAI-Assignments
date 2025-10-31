import express from 'express';
import { z } from 'zod';
import fetch from 'node-fetch';

const router = express.Router();

const JiraRequestSchema = z.object({
  jiraId: z.string().min(1)
});

router.get('/:jiraId', async (req, res) => {
  try {
    const { jiraId } = JiraRequestSchema.parse({ jiraId: req.params.jiraId });

    const jiraApiBase = process.env.JIRA_API_BASE;
    const jiraEmail = process.env.JIRA_EMAIL;
    const jiraApiKey = process.env.JIRA_API_KEY;

    if (!jiraApiBase || !jiraEmail || !jiraApiKey) {
      throw new Error('JIRA API configuration is missing');
    }

    const response = await fetch(`${jiraApiBase}/issue/${jiraId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${jiraEmail}:${jiraApiKey}`).toString('base64')}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`JIRA API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Function to convert Atlassian Document Format to plain text
    const convertADFToText = (adf: any): string => {
      if (!adf || !adf.content) return '';
      
      return adf.content.map((block: any) => {
        if (block.type === 'paragraph') {
          return (block.content || [])
            .map((content: any) => content.text || '')
            .join('') + '\n\n';
        } else if (block.type === 'bulletList' || block.type === 'orderedList') {
          return block.content
            .map((item: any) => {
              const text = item.content
                .map((content: any) => convertADFToText(content))
                .join('');
              return `• ${text}\n`;
            })
            .join('');
        }
        return '';
      }).join('').trim();
    };

    // Parse description and acceptance criteria from the description field
    const fullText = convertADFToText(data.fields.description);
    const acceptanceCriteriaMarker = 'Acceptance Criteria:';
    const markerIndex = fullText.indexOf(acceptanceCriteriaMarker);
    
    let description = '';
    let acceptanceCriteria = '';

    if (markerIndex !== -1) {
      description = fullText.substring(0, markerIndex).trim();
      acceptanceCriteria = fullText.substring(markerIndex + acceptanceCriteriaMarker.length).trim();
    } else {
      description = fullText.trim();
    }

    // Extract relevant fields from JIRA response
    const issue = {
      id: data.id,
      key: data.key,
      summary: data.fields.summary,
      description,
      status: data.fields.status.name,
      acceptanceCriteria
    };

    res.json(issue);
  } catch (error) {
    console.error('Error fetching JIRA issue:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch JIRA issue'
    });
  }
});

export const jiraRouter = router;