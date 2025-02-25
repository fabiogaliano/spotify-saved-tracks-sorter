import { defineCommand, runMain } from 'citty'
import { intro, outro, select } from '@clack/prompts'
import analyzeLyrics from './commands/analyze-lyrics'
import analyzePlaylist from './commands/analyze-playlist'

const main = defineCommand({
  meta: {
    name: 'music-analyzer',
    description: 'Music analysis tools using LLM'
  },
  subCommands: {
    analyze: defineCommand({
      meta: {
        name: 'analyze',
        description: 'Analyze music content'
      },
      subCommands: {
        lyrics: analyzeLyrics,
        playlist: analyzePlaylist
      }
    })
  },
  async run({ args }) {
    // If no command specified, show interactive menu
    if (process.argv.length <= 2) {
      intro('🎵 Music Analyzer')

      const analysisType = await select({
        message: 'What would you like to analyze?',
        options: [
          { value: 'lyrics', label: 'Song Lyrics Analysis' },
          { value: 'playlist', label: 'Playlist Analysis' }
        ]
      })

      if (!analysisType) {
        outro('No analysis type selected')
        return
      }

      // Run the selected command
      if (analysisType === 'lyrics') {
        return analyzeLyrics.run({ args: {} })
      } else {
        return analyzePlaylist.run({ args: {} })
      }
    }
  }
})

runMain(main)
