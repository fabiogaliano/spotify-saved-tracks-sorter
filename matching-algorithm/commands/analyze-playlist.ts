import { v4 as uuidv4 } from 'uuid'
import { Langfuse } from "langfuse"
import { PlaylistAnalysis, PlaylistCommandOptions } from './shared/types'
import { defineCommand } from 'citty'
import { intro, outro, select, spinner, text } from '@clack/prompts'
import { readdir, mkdir, stat, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { LlmProviderManager } from '~/core/services/llm/LlmProviderManager'

const DEFAULT_PLAYLIST_NAME = 'my reset ritual'
const DEFAULT_PLAYLIST_DESCRIPTION = 'AI: the feel good playlist to put on for, my weekend reset ritual. light a scented candle, take a long slow shower while singing along, deep conditioning and then shaving, finishing off with the skin care routine that leaves me refreshed, positive and ready to face the world with high self esteem'
const MAX_NAME_LENGTH = 100
const MAX_DESCRIPTION_LENGTH = 300

const langfuse = new Langfuse({
  secretKey: 'sk-lf-8654fa77-4d1e-4250-a329-4e5d87ca05cc',
  publicKey: 'pk-lf-215c0a6c-5c3f-43df-a76a-eac10d69c975',
  baseUrl: "https://cloud.langfuse.com"
})

export default defineCommand({
  meta: {
    name: 'playlist',
    description: 'Analyze playlist using LLM'
  },
  args: {
    name: {
      type: 'string',
      description: 'Playlist name',
      default: DEFAULT_PLAYLIST_NAME
    },
    description: {
      type: 'string',
      description: 'Playlist description',
      default: DEFAULT_PLAYLIST_DESCRIPTION
    }
  },
  async run({ args }) {
    let { name, description } = args as PlaylistCommandOptions

    // If no command line args provided, use interactive input
    if (process.argv.length <= 3) {
      const nameResponse = await select({
        message: 'Enter playlist name (or press Enter for default)',
        options: [
          { value: DEFAULT_PLAYLIST_NAME, label: `Use default: "${DEFAULT_PLAYLIST_NAME}"` },
          { value: 'custom', label: 'Enter custom name' }
        ]
      })

      if (!nameResponse) {
        outro('Operation cancelled')
        return
      }

      if (nameResponse === 'custom') {
        const customName = await text({
          message: 'Enter playlist name',
          validate(value) {
            if (value.length > MAX_NAME_LENGTH) {
              return `Name must not exceed ${MAX_NAME_LENGTH} characters`
            }
          }
        })

        if (!customName) {
          outro('Operation cancelled')
          return
        }
        name = customName.toString()
      }

      const descResponse = await select({
        message: 'Enter playlist description (or press Enter for default)',
        options: [
          { value: DEFAULT_PLAYLIST_DESCRIPTION, label: 'Use default description' },
          { value: 'custom', label: 'Enter custom description' }
        ]
      })

      if (!descResponse) {
        outro('Operation cancelled')
        return
      }

      if (descResponse === 'custom') {
        const customDesc = await text({
          message: 'Enter playlist description',
          validate(value) {
            if (value.length > MAX_DESCRIPTION_LENGTH) {
              return `Description must not exceed ${MAX_DESCRIPTION_LENGTH} characters`
            }
          }
        })

        if (!customDesc) {
          outro('Operation cancelled')
          return
        }
        description = customDesc.toString()
      }
    } else {
      // Validate command line args
      if (name && name.length > MAX_NAME_LENGTH) {
        throw new Error(`Playlist name must not exceed ${MAX_NAME_LENGTH} characters`)
      }
      if (description && description.length > MAX_DESCRIPTION_LENGTH) {
        throw new Error(`Playlist description must not exceed ${MAX_DESCRIPTION_LENGTH} characters`)
      }
    }

    intro('🎵 Playlist Analyzer')

    const promptsDir = join(process.cwd(), 'prompts')
    const outputDir = join(process.cwd(), 'llm-output_playlist-analysis')

    await mkdir(outputDir, { recursive: true })

    const promptPath = join(promptsDir, 'playlist-analysis_prompt.txt')
    let promptTemplate = await readFile(promptPath, 'utf-8')

    // Replace placeholders in the prompt with values or defaults
    promptTemplate = promptTemplate
      .replace('{playlist_name}', name || DEFAULT_PLAYLIST_NAME)
      .replace('{playlist_description}', description || DEFAULT_PLAYLIST_DESCRIPTION)

    // Add system instruction to ensure JSON response
    const systemInstruction = 'You are a music analysis AI. Your task is to analyze the given playlist and return ONLY a JSON response matching the format specified. Do not include any other text or explanation outside of the JSON.'

    // Add system instruction to the prompt
    promptTemplate = `${systemInstruction}\n\n${promptTemplate}`

    const trace = langfuse?.trace({
      id: uuidv4(),
      name: "playlist-analysis",
      userId: "cli",
      tags: ["cli"],
    })

    const analysisSpan = trace?.span({ name: "analysis-execution" })
    const s = spinner()
    s.start('Analyzing playlist...')

    const llmManager = new LlmProviderManager()
    llmManager.switchProvider('google', process.env.GOOGLE_API_KEY!)

    try {
      const generation = trace?.generation({
        name: "playlist-generation",
        model: "gemini-2.0-flash-001",
        input: promptTemplate,
      })

      const result = await llmManager.generateText(promptTemplate)
      generation?.end({
        output: result,
        usage: {
          completionTokens: result.usage.completionTokens,
          promptTokens: result.usage.promptTokens,
          totalTokens: result.usage.totalTokens
        }
      })

      // Clean up the response and try to parse as JSON
      let analysisData
      try {
        // Remove any potential text before or after the JSON
        const jsonMatch = result.text.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          throw new Error('No JSON object found in the response')
        }

        const jsonStr = jsonMatch[0]
          .replace(/```json\n|\n```/g, '') // Remove code blocks
          .replace(/\\n/g, '') // Remove escaped newlines
          .trim()

        analysisData = JSON.parse(jsonStr)

        // Validate required fields
        if (!analysisData.meaning || !analysisData.emotional || !analysisData.context || !analysisData.matchability) {
          throw new Error('Response is missing required fields')
        }
      } catch (e) {
        console.error('Error: raw LLM response:', result.text)
      }

      const analysis: PlaylistAnalysis = {
        timestamp: new Date().toISOString(),
        playlist: {
          id: `playlist_${uuidv4().split('-')[0]}`,
          name,
          description,
          track_ids: Array(2).fill(0).map(() => `track_${uuidv4().split('-')[0]}`),
          ...analysisData
        }
      }

      const outputPath = join(outputDir, `${analysis.playlist.id}_${Date.now()}.json`)
      await writeFile(outputPath, JSON.stringify(analysis, null, 2))

      analysisSpan?.end()
      trace?.update({
        output: {
          status: "success"
        }
      })

      s.stop('✅ Analysis complete!')
      outro(`🎶 Done! Check results in ${outputDir}`)
    } catch (error) {
      analysisSpan?.end()
      trace?.update({
        output: {
          status: "error",
          error: error instanceof Error ? error.message : String(error)
        }
      })
      s.stop('❌ Analysis failed!')
      throw error
    } finally {
      langfuse?.flush()
    }
  }
})
