import { useState, useRef, useCallback, useEffect, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Stars, Float, Trail, Text, MeshDistortMaterial, Environment } from '@react-three/drei'
import * as THREE from 'three'

// Game state types
interface Orb {
  id: number
  position: [number, number, number]
  color: string
  points: number
}

interface Obstacle {
  id: number
  position: [number, number, number]
  speed: number
}

// Generate random position
const randomPosition = (range: number): [number, number, number] => [
  (Math.random() - 0.5) * range,
  (Math.random() - 0.5) * range,
  (Math.random() - 0.5) * range
]

// Player ship component
function PlayerShip({ position, onPositionChange }: {
  position: THREE.Vector3
  onPositionChange: (pos: THREE.Vector3) => void
}) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const targetPos = useRef(new THREE.Vector3(0, 0, 0))
  const { viewport, camera } = useThree()

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1
      const y = -(e.clientY / window.innerHeight) * 2 + 1
      targetPos.current.set(
        x * viewport.width / 2 * 0.8,
        y * viewport.height / 2 * 0.8,
        0
      )
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0]
        const x = (touch.clientX / window.innerWidth) * 2 - 1
        const y = -(touch.clientY / window.innerHeight) * 2 + 1
        targetPos.current.set(
          x * viewport.width / 2 * 0.8,
          y * viewport.height / 2 * 0.8,
          0
        )
      }
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('touchmove', handleTouchMove)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('touchmove', handleTouchMove)
    }
  }, [viewport])

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.position.lerp(targetPos.current, delta * 8)
      position.copy(meshRef.current.position)
      onPositionChange(position)

      // Tilt based on movement
      const tiltX = (targetPos.current.y - meshRef.current.position.y) * 0.3
      const tiltZ = -(targetPos.current.x - meshRef.current.position.x) * 0.3
      meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, tiltX, delta * 5)
      meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, tiltZ, delta * 5)
    }
  })

  return (
    <Trail
      width={2}
      length={8}
      color="#ff00ff"
      attenuation={(t) => t * t}
    >
      <mesh ref={meshRef} position={[0, 0, 0]}>
        {/* Main body */}
        <group>
          <mesh>
            <coneGeometry args={[0.3, 1, 6]} />
            <meshStandardMaterial
              color="#00ffff"
              emissive="#00ffff"
              emissiveIntensity={0.5}
              metalness={0.8}
              roughness={0.2}
            />
          </mesh>
          {/* Wings */}
          <mesh position={[-0.4, -0.2, 0]} rotation={[0, 0, -0.5]}>
            <boxGeometry args={[0.5, 0.05, 0.2]} />
            <meshStandardMaterial
              color="#ff00ff"
              emissive="#ff00ff"
              emissiveIntensity={0.3}
            />
          </mesh>
          <mesh position={[0.4, -0.2, 0]} rotation={[0, 0, 0.5]}>
            <boxGeometry args={[0.5, 0.05, 0.2]} />
            <meshStandardMaterial
              color="#ff00ff"
              emissive="#ff00ff"
              emissiveIntensity={0.3}
            />
          </mesh>
          {/* Engine glow */}
          <mesh position={[0, -0.6, 0]}>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshStandardMaterial
              color="#ffff00"
              emissive="#ffff00"
              emissiveIntensity={2}
              transparent
              opacity={0.8}
            />
          </mesh>
        </group>
      </mesh>
    </Trail>
  )
}

// Collectible orb component
function CollectibleOrb({ position, color, collected }: {
  position: [number, number, number]
  color: string
  collected: boolean
}) {
  const meshRef = useRef<THREE.Mesh>(null!)

  useFrame((state) => {
    if (meshRef.current && !collected) {
      meshRef.current.rotation.y += 0.02
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 2) * 0.2
    }
  })

  if (collected) return null

  return (
    <Float speed={3} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={meshRef} position={position}>
        <icosahedronGeometry args={[0.3, 1]} />
        <MeshDistortMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1}
          distort={0.3}
          speed={4}
          transparent
          opacity={0.9}
        />
        {/* Inner glow */}
        <pointLight color={color} intensity={2} distance={3} />
      </mesh>
    </Float>
  )
}

// Obstacle component
function Obstacle({ position, speed }: { position: [number, number, number]; speed: number }) {
  const meshRef = useRef<THREE.Mesh>(null!)

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * speed
      meshRef.current.rotation.y += delta * speed * 0.7
      meshRef.current.position.z += delta * speed * 2

      // Reset position when past camera
      if (meshRef.current.position.z > 10) {
        meshRef.current.position.z = -30
        meshRef.current.position.x = (Math.random() - 0.5) * 12
        meshRef.current.position.y = (Math.random() - 0.5) * 8
      }
    }
  })

  return (
    <mesh ref={meshRef} position={position}>
      <octahedronGeometry args={[0.8 + Math.random() * 0.5, 0]} />
      <meshStandardMaterial
        color="#ff3366"
        emissive="#ff0033"
        emissiveIntensity={0.3}
        metalness={0.9}
        roughness={0.3}
        wireframe
      />
    </mesh>
  )
}

// Background ring
function BackgroundRing({ radius, color, speed }: { radius: number; color: string; speed: number }) {
  const meshRef = useRef<THREE.Mesh>(null!)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * speed) * 0.5
      meshRef.current.rotation.y += 0.002 * speed
    }
  })

  return (
    <mesh ref={meshRef} position={[0, 0, -20]}>
      <torusGeometry args={[radius, 0.05, 16, 100]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.5}
        transparent
        opacity={0.6}
      />
    </mesh>
  )
}

// Game scene
function GameScene({
  orbs,
  obstacles,
  onCollect,
  onHit,
  gameActive
}: {
  orbs: Orb[]
  obstacles: Obstacle[]
  onCollect: (id: number, points: number) => void
  onHit: () => void
  gameActive: boolean
}) {
  const playerPos = useRef(new THREE.Vector3(0, 0, 0))
  const collectedIds = useRef<Set<number>>(new Set())

  const handlePositionChange = useCallback((pos: THREE.Vector3) => {
    if (!gameActive) return

    // Check orb collisions
    orbs.forEach(orb => {
      if (collectedIds.current.has(orb.id)) return
      const orbPos = new THREE.Vector3(...orb.position)
      if (pos.distanceTo(orbPos) < 0.8) {
        collectedIds.current.add(orb.id)
        onCollect(orb.id, orb.points)
      }
    })

    // Check obstacle collisions
    obstacles.forEach(obs => {
      const obsPos = new THREE.Vector3(...obs.position)
      if (pos.distanceTo(obsPos) < 1.2) {
        onHit()
      }
    })
  }, [orbs, obstacles, onCollect, onHit, gameActive])

  return (
    <>
      {/* Ambient lighting */}
      <ambientLight intensity={0.2} />
      <directionalLight position={[10, 10, 5]} intensity={0.5} color="#ffffff" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#ff00ff" />
      <pointLight position={[10, -10, 10]} intensity={0.5} color="#00ffff" />

      {/* Stars background */}
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      {/* Background rings */}
      <BackgroundRing radius={15} color="#ff00ff" speed={0.5} />
      <BackgroundRing radius={18} color="#00ffff" speed={0.3} />
      <BackgroundRing radius={22} color="#ffff00" speed={0.7} />

      {/* Player */}
      {gameActive && (
        <PlayerShip position={playerPos.current} onPositionChange={handlePositionChange} />
      )}

      {/* Orbs */}
      {orbs.map(orb => (
        <CollectibleOrb
          key={orb.id}
          position={orb.position}
          color={orb.color}
          collected={collectedIds.current.has(orb.id)}
        />
      ))}

      {/* Obstacles */}
      {obstacles.map(obs => (
        <Obstacle key={obs.id} position={obs.position} speed={obs.speed} />
      ))}
    </>
  )
}

// Floating 3D text
function FloatingTitle({ text, position, color }: { text: string; position: [number, number, number]; color: string }) {
  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
      <Text
        position={position}
        fontSize={1.5}
        color={color}
        anchorX="center"
        anchorY="middle"
        font="https://fonts.gstatic.com/s/orbitron/v29/yMJRMIlzdpvBhQQL_Qq7dy0.woff"
      >
        {text}
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
        />
      </Text>
    </Float>
  )
}

// Title screen scene
function TitleScene() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 0, 5]} intensity={2} color="#ff00ff" />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={2} />
      <BackgroundRing radius={8} color="#ff00ff" speed={1} />
      <BackgroundRing radius={10} color="#00ffff" speed={0.7} />
      <BackgroundRing radius={12} color="#ffff00" speed={1.3} />
      <FloatingTitle text="NEON ORB" position={[0, 1.5, 0]} color="#00ffff" />
      <FloatingTitle text="CATCHER" position={[0, -0.5, 0]} color="#ff00ff" />
    </>
  )
}

// Main App
export default function App() {
  const [gameState, setGameState] = useState<'title' | 'playing' | 'gameover'>('title')
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [orbs, setOrbs] = useState<Orb[]>([])
  const [obstacles, setObstacles] = useState<Obstacle[]>([])
  const [lives, setLives] = useState(3)
  const [level, setLevel] = useState(1)

  // Generate orbs
  const generateOrbs = useCallback((count: number) => {
    const colors = ['#00ffff', '#ff00ff', '#ffff00', '#00ff00', '#ff6600']
    return Array.from({ length: count }, (_, i) => ({
      id: Date.now() + i,
      position: randomPosition(15) as [number, number, number],
      color: colors[Math.floor(Math.random() * colors.length)],
      points: Math.floor(Math.random() * 50) + 10
    }))
  }, [])

  // Generate obstacles
  const generateObstacles = useCallback((count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      id: Date.now() + i + 1000,
      position: [
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 8,
        -10 - Math.random() * 20
      ] as [number, number, number],
      speed: 1 + Math.random() * 2
    }))
  }, [])

  // Start game
  const startGame = useCallback(() => {
    setGameState('playing')
    setScore(0)
    setLives(3)
    setLevel(1)
    setOrbs(generateOrbs(10))
    setObstacles(generateObstacles(5))
  }, [generateOrbs, generateObstacles])

  // Handle orb collection
  const handleCollect = useCallback((id: number, points: number) => {
    setScore(prev => {
      const newScore = prev + points
      // Level up every 200 points
      if (Math.floor(newScore / 200) > Math.floor(prev / 200)) {
        setLevel(l => l + 1)
        setOrbs(prevOrbs => [...prevOrbs, ...generateOrbs(3)])
        setObstacles(prevObs => [...prevObs, ...generateObstacles(2)])
      }
      return newScore
    })
    setOrbs(prev => prev.filter(o => o.id !== id))

    // Add new orb
    setTimeout(() => {
      setOrbs(prev => [...prev, ...generateOrbs(1)])
    }, 500)
  }, [generateOrbs, generateObstacles])

  // Handle obstacle hit
  const handleHit = useCallback(() => {
    setLives(prev => {
      const newLives = prev - 1
      if (newLives <= 0) {
        setGameState('gameover')
        setHighScore(h => Math.max(h, score))
      }
      return newLives
    })
  }, [score])

  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative" style={{ fontFamily: "'Orbitron', sans-serif" }}>
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 0, 10], fov: 60 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#050510']} />
        <fog attach="fog" args={['#050510', 10, 50]} />

        <Suspense fallback={null}>
          {gameState === 'title' && <TitleScene />}
          {(gameState === 'playing' || gameState === 'gameover') && (
            <GameScene
              orbs={orbs}
              obstacles={obstacles}
              onCollect={handleCollect}
              onHit={handleHit}
              gameActive={gameState === 'playing'}
            />
          )}
        </Suspense>
      </Canvas>

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Title Screen UI */}
        {gameState === 'title' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-auto">
            <div className="text-center px-4">
              <p className="text-cyan-400 text-sm md:text-lg tracking-[0.3em] mb-8 animate-pulse">
                MOVE YOUR CURSOR TO CONTROL
              </p>
              <button
                onClick={startGame}
                className="relative px-8 md:px-12 py-4 md:py-5 text-lg md:text-xl tracking-[0.2em] text-black bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-yellow-400 hover:from-fuchsia-500 hover:via-yellow-400 hover:to-cyan-400 transition-all duration-500 transform hover:scale-110 active:scale-95 min-h-[56px]"
                style={{
                  clipPath: 'polygon(10% 0%, 100% 0%, 90% 100%, 0% 100%)',
                  boxShadow: '0 0 30px rgba(255, 0, 255, 0.5), 0 0 60px rgba(0, 255, 255, 0.3)'
                }}
              >
                START GAME
              </button>
              <p className="text-fuchsia-400/60 text-xs md:text-sm mt-8">
                HIGH SCORE: {highScore}
              </p>
            </div>
          </div>
        )}

        {/* Playing UI */}
        {gameState === 'playing' && (
          <>
            {/* Score */}
            <div className="absolute top-4 md:top-8 left-4 md:left-8">
              <div className="text-cyan-400 text-xs md:text-sm tracking-[0.2em] opacity-70">SCORE</div>
              <div className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text text-transparent">
                {score.toString().padStart(6, '0')}
              </div>
            </div>

            {/* Level */}
            <div className="absolute top-4 md:top-8 right-4 md:right-8 text-right">
              <div className="text-fuchsia-400 text-xs md:text-sm tracking-[0.2em] opacity-70">LEVEL</div>
              <div className="text-3xl md:text-5xl font-bold text-fuchsia-500">
                {level}
              </div>
            </div>

            {/* Lives */}
            <div className="absolute top-20 md:top-24 left-4 md:left-8">
              <div className="text-yellow-400 text-xs md:text-sm tracking-[0.2em] opacity-70 mb-1">LIVES</div>
              <div className="flex gap-2">
                {Array.from({ length: 3 }, (_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 md:w-4 md:h-4 ${i < lives ? 'bg-yellow-400 shadow-[0_0_10px_#fbbf24]' : 'bg-gray-700'}`}
                    style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
                  />
                ))}
              </div>
            </div>

            {/* Instructions */}
            <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 text-center">
              <p className="text-cyan-400/40 text-xs tracking-[0.15em]">
                COLLECT ORBS • AVOID RED OBSTACLES
              </p>
            </div>
          </>
        )}

        {/* Game Over UI */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto">
            <div className="text-center px-4">
              <h2
                className="text-4xl md:text-6xl font-bold mb-4 tracking-[0.1em]"
                style={{
                  background: 'linear-gradient(135deg, #ff0066, #ff00ff, #00ffff)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 0 40px rgba(255, 0, 255, 0.5)'
                }}
              >
                GAME OVER
              </h2>

              <div className="mb-8">
                <div className="text-cyan-400/60 text-sm tracking-[0.2em]">FINAL SCORE</div>
                <div className="text-4xl md:text-6xl font-bold text-cyan-400">
                  {score}
                </div>
                {score >= highScore && score > 0 && (
                  <div className="text-yellow-400 text-sm tracking-[0.2em] mt-2 animate-pulse">
                    ★ NEW HIGH SCORE ★
                  </div>
                )}
              </div>

              <button
                onClick={startGame}
                className="px-8 md:px-12 py-4 text-lg md:text-xl tracking-[0.2em] text-black bg-gradient-to-r from-fuchsia-500 to-cyan-400 hover:from-cyan-400 hover:to-fuchsia-500 transition-all duration-300 transform hover:scale-105 active:scale-95 min-h-[56px]"
                style={{
                  clipPath: 'polygon(10% 0%, 100% 0%, 90% 100%, 0% 100%)',
                  boxShadow: '0 0 30px rgba(0, 255, 255, 0.5)'
                }}
              >
                PLAY AGAIN
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="absolute bottom-2 md:bottom-4 left-1/2 transform -translate-x-1/2 text-center z-10">
        <p className="text-[10px] md:text-xs tracking-wider text-white/20 hover:text-white/40 transition-colors duration-300">
          Requested by @Nishant293 · Built by @clonkbot
        </p>
      </footer>
    </div>
  )
}
