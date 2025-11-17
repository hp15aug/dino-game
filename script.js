import { updateGround, setupGround } from "./ground.js"
import { updateDino, setupDino, getDinoRect, setDinoLose } from "./dino.js"
import { updateCactus, setupCactus, getCactusRects } from "./cactus.js"
import BotBrain from "./botbrain.js"

const WORLD_WIDTH = 800
const WORLD_HEIGHT = 450
const SPEED_SCALE_INCREASE = 0.00003
const POPULATION_SIZE = 50
const JUMP_THRESHOLD = 0.55

const worldElem = document.querySelector("[data-world]")
const scoreElem = document.querySelector("[data-score]")
const startScreenElem = document.querySelector("[data-start-screen]")

let aiMode = false
let population = []
let currentBrain = null
let generation = 1
let bestScore = 0
let gamesPlayed = 0

setPixelToWorldScale()
window.addEventListener("resize", setPixelToWorldScale)
document.addEventListener("keydown", handleStart, { once: true })

let lastTime
let speedScale
let score

function update(time) {
  if (lastTime == null) {
    lastTime = time
    window.requestAnimationFrame(update)
    return
  }
  const delta = time - lastTime

  updateGround(delta, speedScale)
  updateCactus(delta, speedScale)
  updateSpeedScale(delta)
  updateScore(delta)
  
  // AI decision making
  let shouldJump = false
  if (aiMode && currentBrain) {
    const dinoRect = getDinoRect()
    const cactusRects = getCactusRects()
    
    // Find closest cactus ahead of dino
    let closestDistance = Infinity
    let closestHeight = 0
    
    for (let cactus of cactusRects) {
      const distance = cactus.left - dinoRect.right
      if (distance > 0 && distance < closestDistance) {
        closestDistance = distance
        closestHeight = cactus.height
      }
    }
    
    // Only make decision if cactus is nearby
    if (closestDistance < 500 && closestDistance !== Infinity) {
      const decision = currentBrain.predict(closestDistance, closestHeight, speedScale)
      shouldJump = decision > JUMP_THRESHOLD
    }
    
    updateDino(delta, speedScale, shouldJump)
    
    currentBrain.score = score
    currentBrain.fitness = score
  } else {
    updateDino(delta, speedScale, false)
  }
  
  if (checkLose()) return handleLose()

  lastTime = time
  window.requestAnimationFrame(update)
}

function checkLose() {
  const dinoRect = getDinoRect()
  return getCactusRects().some(rect => isCollision(rect, dinoRect))
}

function isCollision(rect1, rect2) {
  const padding = 10
  return (
    rect1.left < rect2.right - padding &&
    rect1.top < rect2.bottom - padding &&
    rect1.right > rect2.left + padding &&
    rect1.bottom > rect2.top + padding
  )
}

function updateSpeedScale(delta) {
  speedScale += delta * SPEED_SCALE_INCREASE
}

function updateScore(delta) {
  score += delta * 0.01
  if (aiMode) {
    scoreElem.textContent = `Score: ${Math.floor(score)} | Gen: ${generation} | Game: ${gamesPlayed + 1}/${POPULATION_SIZE} | Best: ${Math.floor(bestScore)}`
  } else {
    scoreElem.textContent = Math.floor(score)
  }
}

function handleStart(e) {
  // Press 'A' for AI mode, any other key for manual
  if (e.key.toLowerCase() === 'a') {
    aiMode = true
    initializePopulation()
    startScreenElem.innerHTML = `
      <div>AI Training Mode</div>
      <div style="font-size: 20px; margin-top: 10px;">Training 50 Generations...</div>
      <div style="font-size: 16px; margin-top: 10px;">Watch it learn!</div>
    `
  } else {
    aiMode = false
  }
  
  startGame()
}

function initializePopulation() {
  population = []
  for (let i = 0; i < POPULATION_SIZE; i++) {
    population.push(new BotBrain())
  }
  currentBrain = population[0]
  gamesPlayed = 0
}

function startGame() {
  lastTime = null
  speedScale = 1
  score = 0
  setupGround()
  setupDino()
  setupCactus()
  startScreenElem.classList.add("hide")
  window.requestAnimationFrame(update)
}

function handleLose() {
  setDinoLose()
  
  if (aiMode) {
    // Update fitness
    if (currentBrain) {
      currentBrain.fitness = score
      currentBrain.score = score
      
      if (score > bestScore) {
        bestScore = score
      }
    }
    
    gamesPlayed++
    
    // If all bots in generation have played
    if (gamesPlayed >= POPULATION_SIZE) {
      evolvePopulation()
      generation++
      gamesPlayed = 0
      
      console.log(`Generation ${generation} started. Best score so far: ${Math.floor(bestScore)}`)
    }
    
    // Next bot
    currentBrain = population[gamesPlayed]
    
    // Quick restart for AI
    setTimeout(() => {
      startGame()
    }, 50)
  } else {
    setTimeout(() => {
      document.addEventListener("keydown", handleStart, { once: true })
      startScreenElem.innerHTML = `
        <div>Game Over!</div>
        <div style="font-size: 24px; margin-top: 10px;">Score: ${Math.floor(score)}</div>
        <div style="font-size: 20px; margin-top: 10px;">Press Any Key To Restart</div>
        <div style="font-size: 16px; margin-top: 10px;">Press 'A' for AI Mode</div>
      `
      startScreenElem.classList.remove("hide")
    }, 500)
  }
}

function evolvePopulation() {
  // Sort by fitness
  population.sort((a, b) => b.fitness - a.fitness)
  
  const bestFitness = population[0].fitness
  const avgFitness = population.reduce((sum, brain) => sum + brain.fitness, 0) / POPULATION_SIZE
  
  console.log(`Generation ${generation} complete:`)
  console.log(`  Best: ${Math.floor(bestFitness)}`)
  console.log(`  Average: ${Math.floor(avgFitness)}`)
  console.log(`  Worst: ${Math.floor(population[POPULATION_SIZE - 1].fitness)}`)
  
  // Keep top 20%
  const survivors = Math.ceil(POPULATION_SIZE * 0.2)
  const newPopulation = []
  
  // Elite - keep best 2 unchanged
  newPopulation.push(population[0].clone())
  if (POPULATION_SIZE > 1) {
    newPopulation.push(population[1].clone())
  }
  
  // Breed and mutate to fill population
  while (newPopulation.length < POPULATION_SIZE) {
    const parent1 = population[Math.floor(Math.random() * survivors)]
    const parent2 = population[Math.floor(Math.random() * survivors)]
    
    const child = BotBrain.crossover(parent1, parent2)
    child.mutate(0.25)
    newPopulation.push(child)
  }
  
  population = newPopulation
}

function setPixelToWorldScale() {
  worldElem.style.width = `${WORLD_WIDTH}px`
  worldElem.style.height = `${WORLD_HEIGHT}px`
}