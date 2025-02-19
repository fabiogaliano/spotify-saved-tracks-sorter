import { defineCommand, runMain } from 'citty'
import { intro, outro, select, spinner } from '@clack/prompts'
import { readdir, mkdir, stat, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { LlmProviderManager } from '../app/core/services/llm/LlmProviderManager'
import { v4 as uuidv4 } from 'uuid'
import { Langfuse } from "langfuse";
import { LlmProviderResponse } from '~/core/domain/LlmProvider'

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
      userId: "cli",
      tags: ["cli"],
    });

    const analysisSpan = trace.span({ name: "analysis-execution" });

    const s = spinner()
    s.start('Analyzing lyrics...')

    const llmManager = new LlmProviderManager()
    llmManager.switchProvider('google', process.env.GOOGLE_API_KEY!)

    try {
      const promptTemplate = await readFile(join(promptsDir, promptFile.toString()), 'utf-8')

      const lyricsData = JSON.parse(
        await readFile(join(lyricsDir, lyricsFile.toString()), 'utf-8')
      )

      const [artist, title] = lyricsFile.toString()
        .replace('.json', '')
        .split('_')
        .map(part => part.replace(/-/g, ' '))

      const filledPrompt = promptTemplate
        .replace('{artist}', artist)
        .replace('{title}', title)
        .replace('{lyrics_with_annotations}', JSON.stringify(lyricsData, null, 2))

      const generation = trace.generation({
        name: "lyrics-generation",
        model: "gemini-2.0-flash-001",
        input: filledPrompt,
      });

      const result = await llmManager.generateText(filledPrompt)
      generation.end({ output: result, usage: { completionTokens: result.usage.completionTokens, promptTokens: result.usage.promptTokens, totalTokens: result.usage.totalTokens } })

      const outputPath = join(outputDir, `${lyricsFile.toString().replace('.json', '')}_analysis.json`)
      await writeFile(outputPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        input: {
          prompt: promptFile,
          lyrics: lyricsFile
        },
        analysis: JSON.parse(result.text.replace(/```json\n|\n```/g, ''))
      }, null, 2))

      analysisSpan.end();
      trace.update({
        output: {
          status: "success"
        }
      });

      s.stop('Analysis complete!')
      outro('Done! Check results in llm_outputs directory')
    } catch (error) {
      analysisSpan.end();
      trace.update({
        output: {
          status: "error",
          error: error instanceof Error ? error.message : String(error)
        }
      });
      s.stop('Analysis failed!')
      throw error
    } finally {
      langfuse.flush();
    }
  }
})

runMain(main)