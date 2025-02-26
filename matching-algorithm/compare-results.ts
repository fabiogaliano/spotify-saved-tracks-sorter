#!/usr/bin/env bun
import { intro, outro, select, spinner } from '@clack/prompts'
import fs from 'fs'
import path from 'path'
import { table } from 'table'
import chalk from 'chalk'

// Result file type definition
interface AlgorithmResult {
  commit_hash: string
  timestamp: string
  playlist: {
    id: string
    name: string
    dominant_mood: string
  }
  matches: Array<{
    track: {
      title: string
      artist: string
    }
    final_score: number
    component_scores: Record<string, number>
    veto_applied?: boolean
    veto_reason?: string
  }>
}

async function compareResults() {
  intro('🔍 Algorithm Results Comparison')
  
  // Get all result files from the evaluation directory
  const resultsDir = path.resolve(process.cwd(), 'algorithm_evaluation_results')
  const resultFiles = fs.readdirSync(resultsDir)
    .filter(file => file.startsWith('results_') && file.endsWith('.json'))
    .sort((a, b) => {
      // Sort by timestamp (newest first) - extract from filename or file stats
      const statsA = fs.statSync(path.join(resultsDir, a))
      const statsB = fs.statSync(path.join(resultsDir, b))
      return statsB.mtime.getTime() - statsA.mtime.getTime()
    })
  
  if (resultFiles.length < 2) {
    outro(chalk.yellow('Need at least 2 result files to compare. Only found: ' + resultFiles.length))
    return
  }
  
  // Create options for selection
  const fileOptions = resultFiles.map(file => {
    // Extract commit hash and timestamp from filename
    const commitHash = file.split('_')[1] || 'unknown'
    const timestamp = new Date(fs.statSync(path.join(resultsDir, file)).mtime).toLocaleString()
    return {
      value: file,
      label: `${chalk.green(commitHash)} (${timestamp})`
    }
  })
  
  // Let user select first file
  const firstFile = await select({
    message: 'Select first result file:',
    options: fileOptions
  }) as string
  
  if (!firstFile) {
    outro('No file selected')
    return
  }
  
  // Filter out the first file from options for second selection
  const secondFileOptions = fileOptions.filter(opt => opt.value !== firstFile)
  
  // Let user select second file
  const secondFile = await select({
    message: 'Select second result file:',
    options: secondFileOptions
  }) as string
  
  if (!secondFile) {
    outro('No second file selected')
    return
  }
  
  // Show loading spinner
  const loadingSpinner = spinner()
  loadingSpinner.start('Comparing algorithm results...')
  
  try {
    // Load both files
    const firstData = JSON.parse(fs.readFileSync(path.join(resultsDir, firstFile), 'utf-8')) as AlgorithmResult
    const secondData = JSON.parse(fs.readFileSync(path.join(resultsDir, secondFile), 'utf-8')) as AlgorithmResult
    
    // Stop spinner
    loadingSpinner.stop('Comparison complete')
    
    // Display summary information for both files
    console.log(chalk.blue('\n=== Algorithm Comparison Summary ===\n'))
    
    const summaryTable = [
      [chalk.bold('Attribute'), chalk.bold(firstData.commit_hash), chalk.bold(secondData.commit_hash)],
      ['Timestamp', new Date(firstData.timestamp).toLocaleString(), new Date(secondData.timestamp).toLocaleString()],
      ['Playlist', firstData.playlist.name, secondData.playlist.name],
      ['Dominant Mood', firstData.playlist.dominant_mood, secondData.playlist.dominant_mood],
      ['Total Matches', firstData.matches.length.toString(), secondData.matches.length.toString()]
    ]
    
    // Print summary table
    console.log(table(summaryTable))
    
    // Match track-by-track comparisons
    console.log(chalk.blue('\n=== Track-by-Track Score Comparison ===\n'))
    
    // Create a map for easier lookup
    const secondDataMap = new Map(
      secondData.matches.map(match => [
        `${match.track.title} - ${match.track.artist}`,
        match
      ])
    )
    
    // Track comparison table header
    const trackCompHeader = [
      chalk.bold('Track'),
      chalk.bold(`${firstData.commit_hash} Score`),
      chalk.bold(`${secondData.commit_hash} Score`),
      chalk.bold('Difference'),
      chalk.bold('Change')
    ]
    
    const trackRows = []
    
    // Compare each track in first result with corresponding track in second result
    for (const firstMatch of firstData.matches) {
      const trackKey = `${firstMatch.track.title} - ${firstMatch.track.artist}`
      const secondMatch = secondDataMap.get(trackKey)
      
      if (secondMatch) {
        const scoreDiff = secondMatch.final_score - firstMatch.final_score
        const diffPercent = (scoreDiff / firstMatch.final_score) * 100
        
        // Format the difference with color based on positive/negative
        const formattedDiff = scoreDiff > 0 
          ? chalk.green(`+${scoreDiff.toFixed(3)}`) 
          : scoreDiff < 0 
            ? chalk.red(scoreDiff.toFixed(3)) 
            : chalk.gray('0.000')
        
        // Format the percent change
        const formattedPercent = diffPercent > 0 
          ? chalk.green(`+${diffPercent.toFixed(1)}%`) 
          : diffPercent < 0 
            ? chalk.red(`${diffPercent.toFixed(1)}%`) 
            : chalk.gray('0.0%')
        
        trackRows.push([
          trackKey,
          firstMatch.final_score.toFixed(3),
          secondMatch.final_score.toFixed(3),
          formattedDiff,
          formattedPercent
        ])
      }
    }
    
    // Sort by score difference (largest to smallest)
    trackRows.sort((a, b) => {
      const diffA = parseFloat(a[3].replace(/\u001b\[\d+m/g, '')) // Remove ANSI color codes
      const diffB = parseFloat(b[3].replace(/\u001b\[\d+m/g, ''))
      return Math.abs(diffB) - Math.abs(diffA) // Sort by absolute difference
    })
    
    // Print track comparison table with the header
    console.log(table([trackCompHeader, ...trackRows]))
    
    // Compare component scores for better analysis
    console.log(chalk.blue('\n=== Component Score Comparison ===\n'))
    
    // Get all unique component keys from both results
    const allComponents = new Set<string>()
    firstData.matches.forEach(match => {
      Object.keys(match.component_scores).forEach(key => allComponents.add(key))
    })
    secondData.matches.forEach(match => {
      Object.keys(match.component_scores).forEach(key => allComponents.add(key))
    })
    
    // Create component comparison table
    const componentHeader = [
      chalk.bold('Component'),
      chalk.bold(`${firstData.commit_hash} Avg`),
      chalk.bold(`${secondData.commit_hash} Avg`),
      chalk.bold('Difference'),
      chalk.bold('Change')
    ]
    
    const componentRows = []
    
    // Calculate average for each component
    for (const component of allComponents) {
      // Calculate first file average
      const firstAvg = firstData.matches.reduce((sum, match) => {
        return sum + (match.component_scores[component] || 0)
      }, 0) / firstData.matches.length
      
      // Calculate second file average
      const secondAvg = secondData.matches.reduce((sum, match) => {
        return sum + (match.component_scores[component] || 0)
      }, 0) / secondData.matches.length
      
      const diff = secondAvg - firstAvg
      const percentChange = (diff / firstAvg) * 100
      
      // Format with colors
      const formattedDiff = diff > 0 
        ? chalk.green(`+${diff.toFixed(3)}`) 
        : diff < 0 
          ? chalk.red(diff.toFixed(3)) 
          : chalk.gray('0.000')
      
      const formattedPercent = percentChange > 0 
        ? chalk.green(`+${percentChange.toFixed(1)}%`) 
        : percentChange < 0 
          ? chalk.red(`${percentChange.toFixed(1)}%`) 
          : chalk.gray('0.0%')
      
      componentRows.push([
        component,
        firstAvg.toFixed(3),
        secondAvg.toFixed(3),
        formattedDiff,
        formattedPercent
      ])
    }
    
    // Sort by largest difference
    componentRows.sort((a, b) => {
      const diffA = parseFloat(a[3].replace(/\u001b\[\d+m/g, ''))
      const diffB = parseFloat(b[3].replace(/\u001b\[\d+m/g, ''))
      return Math.abs(diffB) - Math.abs(diffA)
    })
    
    // Print component comparison table
    console.log(table([componentHeader, ...componentRows]))
    
    // Compare veto statistics
    const firstVetoCount = firstData.matches.filter(m => m.veto_applied).length
    const secondVetoCount = secondData.matches.filter(m => m.veto_applied).length
    
    console.log(chalk.blue('\n=== Veto Logic Comparison ===\n'))
    
    const vetoTable = [
      [chalk.bold('Metric'), chalk.bold(firstData.commit_hash), chalk.bold(secondData.commit_hash)],
      ['Veto Count', firstVetoCount.toString(), secondVetoCount.toString()],
      ['Veto Rate', `${((firstVetoCount / firstData.matches.length) * 100).toFixed(1)}%`, 
                   `${((secondVetoCount / secondData.matches.length) * 100).toFixed(1)}%`]
    ]
    
    console.log(table(vetoTable))
    
    // Final summary stats
    const firstAvgScore = firstData.matches.reduce((sum, m) => sum + m.final_score, 0) / firstData.matches.length
    const secondAvgScore = secondData.matches.reduce((sum, m) => sum + m.final_score, 0) / secondData.matches.length
    
    console.log(chalk.blue('\n=== Overall Performance Comparison ===\n'))
    
    const performanceTable = [
      [chalk.bold('Metric'), chalk.bold(firstData.commit_hash), chalk.bold(secondData.commit_hash), chalk.bold('Change')],
      ['Average Score', 
        firstAvgScore.toFixed(3), 
        secondAvgScore.toFixed(3),
        secondAvgScore > firstAvgScore 
          ? chalk.green(`+${(secondAvgScore - firstAvgScore).toFixed(3)}`) 
          : chalk.red(`${(secondAvgScore - firstAvgScore).toFixed(3)}`)
      ],
      ['Score Range', 
        `${Math.min(...firstData.matches.map(m => m.final_score)).toFixed(3)} - ${Math.max(...firstData.matches.map(m => m.final_score)).toFixed(3)}`,
        `${Math.min(...secondData.matches.map(m => m.final_score)).toFixed(3)} - ${Math.max(...secondData.matches.map(m => m.final_score)).toFixed(3)}`,
        ''
      ]
    ]
    
    console.log(table(performanceTable))
    
  } catch (error) {
    loadingSpinner.stop('Error comparing files')
    console.error('Error comparing algorithm results:', error)
  }
  
  outro('Algorithm comparison complete')
}

// Execute the comparison when script is run directly
compareResults();
