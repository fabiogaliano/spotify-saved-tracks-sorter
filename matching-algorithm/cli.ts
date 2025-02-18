import { defineCommand, runMain } from 'citty'
import { intro, outro, select, spinner } from '@clack/prompts'
import { readdir, mkdir, stat, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { LlmProviderManager } from '../app/core/services/llm/LlmProviderManager'
import { v4 as uuidv4 } from 'uuid'
import { Langfuse } from "langfuse";

const langfuse = new Langfuse({
  secretKey: process.env.LANGFUSE_SECRET_KEY!,
  publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
  baseUrl: "https://cloud.langfuse.com"
});

const main = defineCommand({
  meta: {
    name: 'lyrics-analyzer',
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
    intro('🎵 Lyrics Analyzer')

    const promptsDir = join(process.cwd(), 'matching-algorithm', 'prompts')
    const lyricsDir = join(process.cwd(), 'matching-algorithm', 'lyrics')
    const outputDir = join(process.cwd(), 'matching-algorithm', 'llm-output_lyrics-analysis')

    await mkdir(promptsDir, { recursive: true })
    await mkdir(lyricsDir, { recursive: true })
    await mkdir(outputDir, { recursive: true })

    let promptFile
    if (args.latest) {
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
      promptFile = await select({
        message: 'Select prompt to use',
        options: files.map(f => ({ value: f, label: f }))
      })
    }

    if (!promptFile) {
      throw new Error('No prompt file selected')
    }

    const lyricsFiles = await readdir(lyricsDir)
    const lyricsFile = await select({
      message: 'Select lyrics to analyze',
      options: lyricsFiles.map(f => ({ value: f, label: f }))
    })

    const trace = langfuse.trace({
      id: uuidv4(),
      name: "lyrics-analysis",
      userId: "cli-user",
      tags: ["cli"],
      input: { promptFile, lyricsFile },
      metadata: {
        isLatestPrompt: args.latest,
        timestamp: new Date().toISOString()
      }
    })

    const analysisSpan = trace.span({ name: "analysis-execution" })

    const s = spinner()
    s.start('Analyzing lyrics...')

    const llmManager = new LlmProviderManager()
    llmManager.switchProvider('google', process.env.GOOGLE_API_KEY!)

    try {
      const promptTemplate = await readFile(join(promptsDir, promptFile.toString()), 'utf-8')

      const lyricsData = JSON.parse(
        await readFile(join(lyricsDir, lyricsFile.toString()), 'utf-8')
      )

      // Extract artist and title from filename
      const [artist, title] = lyricsFile.toString()
        .replace('.json', '')
        .split('_')
        .map(part => part.replace(/-/g, ' '))

      const filledPrompt = promptTemplate
        .replace('{artist}', artist)
        .replace('{title}', title)
        .replace('{lyrics_with_annotations}', JSON.stringify(lyricsData, null, 2))

      console.log(filledPrompt)

      const skipLlm = false
      let result
      if (skipLlm) {
        result = "[Skipped LLM call] This is a dummy response"
      } else {
        result = await llmManager.generateText(filledPrompt)
      }

      trace.generation({
        name: "lyrics-generation",
        model: "gemini-2.0-flash-001",
        modelParameters: { temperature: 0.7 },
        input: filledPrompt,
        output: result,
        usageDetails: {
          prompt_tokens: filledPrompt.length, // You might want to get actual token counts
          completion_tokens: result.length
        }
      })

      const outputPath = join(outputDir, `${lyricsFile.toString().replace('.json', '')}_analysis.json`)
      await writeFile(outputPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        input: {
          prompt: promptFile,
          lyrics: lyricsFile
        },
        analysis: JSON.parse(result.replace(/```json\n|\n```/g, ''))
      }, null, 2))

      analysisSpan.end()
      trace.update({
        metadata: {
          status: "success",
          message: "Analysis completed successfully"
        }
      })

      s.stop('Analysis complete!')
      outro('Done! Check results in llm_outputs directory')
    } catch (error) {
      analysisSpan.end()
      trace.update({
        metadata: {
          status: "error",
          message: error instanceof Error ? error.message : String(error)
        }
      })
      s.stop('Analysis failed!')
      throw error
    }
  }
})

runMain(main)