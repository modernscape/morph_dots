'use client'

import { Suspense, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import PointCloudMorph from '@/components/PointCloudMorph'
import OrbitControlsWrapper from '@/components/OrbitControlsWrapper'

export default function Home() {
  const [morphProgress, setMorphProgress] = useState(0)

  return (
    <main style={{ width: '100vw', height: '100vh' }}>
      <Canvas
        camera={{ position: [0, 2, 8], fov: 50 }}
        gl={{ antialias: true }}
        onCreated={({ gl }) => {
          gl.setClearColor('#000000')
        }}
      >
        <Suspense fallback={<mesh><boxGeometry args={[0.2, 0.2, 0.2]} /><meshBasicMaterial color="blue" /></mesh>}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <directionalLight position={[-10, -10, -5]} intensity={0.3} />
          <PointCloudMorph
            model1Path="/models/model1.glb"
            model2Path="/models/model2.glb"
            pointSize={0.05}
            pointDensity={1.0}
            morphProgress={morphProgress}
            model1Position={[-3, 0, 0]}
            model2Position={[3, 0, 0]}
          />
          {/* モデルの位置を示すマーカー */}
          <mesh position={[-3, 0, 0]}>
            <boxGeometry args={[0.1, 0.1, 0.1]} />
            <meshBasicMaterial color="cyan" />
          </mesh>
          <mesh position={[3, 0, 0]}>
            <boxGeometry args={[0.1, 0.1, 0.1]} />
            <meshBasicMaterial color="magenta" />
          </mesh>
          <OrbitControlsWrapper enableDamping dampingFactor={0.05} />
          {/* グリッドヘルパーを追加してデバッグ */}
          <gridHelper args={[20, 20]} />
          <axesHelper args={[5]} />
        </Suspense>
      </Canvas>

      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          zIndex: 10,
          background: 'rgba(0, 0, 0, 0.7)',
          padding: '20px',
          borderRadius: '10px',
          color: 'white',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: '15px' }}>Point Cloud Morph</h2>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '8px' }}>
            Morph Progress: {(morphProgress * 100).toFixed(0)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={morphProgress}
            onChange={(e) => setMorphProgress(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <button
            onClick={() => {
              const start = Date.now()
              const duration = 3000 // 3秒
              const animate = () => {
                const elapsed = Date.now() - start
                const progress = Math.min(elapsed / duration, 1)
                // 往復アニメーション（0 -> 1 -> 0）
                const cycleProgress = progress < 0.5 
                  ? progress * 2 
                  : 2 - progress * 2
                setMorphProgress(cycleProgress)
                if (progress < 1) {
                  requestAnimationFrame(animate)
                }
              }
              animate()
            }}
            style={{
              padding: '10px 20px',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px',
              marginRight: '10px',
            }}
          >
            Animate Morph
          </button>
          <button
            onClick={() => setMorphProgress(0)}
            style={{
              padding: '10px 20px',
              background: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            Reset
          </button>
        </div>
      </div>
    </main>
  )
}
