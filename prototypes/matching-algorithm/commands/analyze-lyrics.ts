import { defineCommand } from 'citty'
import { intro, outro, select, spinner } from '@clack/prompts'
import { readdir, mkdir, stat, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { LlmProviderManager } from '../../app/lib/services/llm/LlmProviderManager'
import { v4 as uuidv4 } from 'uuid'
import { Langfuse } from "langfuse"
import { CommandOptions } from './shared/types'

const langfuse = process.env.LANGFUSE_SECRET_KEY ? new Langfuse({
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
  baseUrl: "https://cloud.langfuse.com"
}) : null

export default defineCommand({
  meta: {
    name: 'lyrics',
    description: 'Analyze song lyrics using LLM'
  },
  args: {
    latest: {
      type: 'boolean',
      description: 'Use most recently edited prompt',
      default: false
    }
  },
  async run({ args }) {
    const { latest } = args as CommandOptions

    intro('🎵 Lyrics Analyzer')

    const promptsDir = join(process.cwd(), 'prompts')
    const lyricsDir = join(process.cwd(), 'lyrics')
    const outputDir = join(process.cwd(), 'llm-output_lyrics-analysis')

    await mkdir(promptsDir, { recursive: true })
    await mkdir(lyricsDir, { recursive: true })
    await mkdir(outputDir, { recursive: true })

    let promptFile
    if (latest) {
      const files = await readdir(promptsDir)
      const filesWithStats = await Promise.all(
        files.map(async (file) => ({
          name: file,
          stat: await stat(join(promptsDir, file))
        }))
      )
      promptFile = filesWithStats
        .sort((a, b) => b.stat.mtime.getTime() - a.stat.mtime.getTime())
      [0].name
    } else {
      const files = await readdir(promptsDir)
      const response = await select({
        message: 'Choose a prompt file',
        options: files.map(file => ({ value: file, label: file }))
      })

      if (!response) {
        outro('No prompt file selected')
        return
      }
      promptFile = response as string
    }

    if (!promptFile) {
      outro('No prompt file selected')
      return
    }

    const lyricsFiles = await readdir(lyricsDir)
    const selectedResponse = await select({
      message: 'Choose a lyrics file',
      options: lyricsFiles.map(file => ({ value: file, label: file }))
    })

    if (!selectedResponse) {
      outro('No lyrics file selected')
      return
    }
    const selectedLyricsFile = selectedResponse as string

    if (!selectedLyricsFile) {
      outro('No lyrics file selected')
      return
    }

    const promptTemplate = await readFile(join(promptsDir, promptFile), 'utf-8')
    const lyrics = await readFile(join(lyricsDir, selectedLyricsFile), 'utf-8')

    const trace = langfuse?.trace({
      id: uuidv4(),
      name: "lyrics-analysis",
      userId: "cli",
      tags: ["cli"],
    })

    const analysisSpan = trace?.span({ name: "analysis-execution" })
    const s = spinner()
    s.start('Analyzing lyrics...')

    const llmManager = new LlmProviderManager('google', process.env.GOOGLE_API_KEY!,)

    try {
      const lyricsData = JSON.parse(
        await readFile(join(lyricsDir, selectedLyricsFile), 'utf-8')
      )

      const [artist, title] = selectedLyricsFile
        .replace('.json', '')
        .split('_')
        .map(part => part.replace(/-/g, ' '))

      const filledPrompt = promptTemplate
        .replace('{artist}', artist)
        .replace('{title}', title)
        .replace('{lyrics_with_annotations}', JSON.stringify(lyricsData, null, 2))

      const generation = trace?.generation({
        name: "lyrics-generation",
        model: "gemini-2.0-flash-001",
        input: filledPrompt,
      })

      const result = await llmManager.generateText(filledPrompt)
      generation?.end({
        output: result,
        usage: {
          completionTokens: result.usage.completionTokens,
          promptTokens: result.usage.promptTokens,
          totalTokens: result.usage.totalTokens
        }
      })

      const outputPath = join(outputDir, `${selectedLyricsFile.replace('.json', '')}_analysis.json`)
      await writeFile(outputPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        track: {
          id: uuidv4(),
          artist,
          title
        },
        analysis: JSON.parse(result.text.replace(/```json\n|\n```/g, ''))
      }, null, 2))

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
