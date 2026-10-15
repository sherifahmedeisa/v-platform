import { describe, it, expect } from 'vitest'
import { ollama } from '../ollama'

describe('Ollama Service', () => {
  it('drafts a targeted paragraph featuring a target entity and query context', async () => {
    const topic = 'Retrieval Augmented Generation (RAG)'
    const query = 'Generative Engine Optimization (GEO)'

    const paragraph = await ollama.draftParagraphForTopic(topic, query)

    expect(paragraph).toBeDefined()
    expect(paragraph.length).toBeGreaterThan(40)
    expect(paragraph.toLowerCase()).toContain(topic.toLowerCase())
  })

  it('streams tokens when onToken callback is provided to draftParagraphForTopic', async () => {
    const topic = 'definitional framing'
    const query = 'AI Search Citations'
    const tokens: string[] = []

    const paragraph = await ollama.draftParagraphForTopic(topic, query, (token) => {
      tokens.push(token)
    })

    expect(tokens.length).toBeGreaterThan(0)
    expect(paragraph).toBe(tokens.join(''))
  })

  it('generates simulated section draft with markdown headings and bullet points', async () => {
    const section = await ollama.generateSectionDraft(
      'Algorithmic Retrieval Architecture',
      'GEO',
      ['semantic parsing', 'empirical benchmarks']
    )

    expect(section).toContain('###')
    expect(section.toLowerCase()).toContain('semantic')
  })
})
