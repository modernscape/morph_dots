'use client'

import { useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import * as THREE from 'three'

interface PointCloudMorphProps {
  model1Path: string
  model2Path: string
  pointSize?: number
  pointDensity?: number
  morphProgress?: number
  model1Position?: [number, number, number]
  model2Position?: [number, number, number]
}

export default function PointCloudMorph({
  model1Path,
  model2Path,
  pointSize = 0.02,
  pointDensity = 0.5,
  morphProgress = 0,
  model1Position = [-3, 0, 0],
  model2Position = [3, 0, 0],
}: PointCloudMorphProps) {
  const [points1, setPoints1] = useState<THREE.BufferGeometry | null>(null)
  const [points2, setPoints2] = useState<THREE.BufferGeometry | null>(null)
  const [colors, setColors] = useState<Float32Array | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pointsRef = useRef<THREE.Points>(null)
  const geometryRef = useRef<THREE.BufferGeometry | null>(null)

  // GLBモデルから点群を生成する関数
  const generatePointCloud = (
    gltf: any,
    density: number,
    offset: [number, number, number] = [0, 0, 0]
  ): { geometry: THREE.BufferGeometry; colors: Float32Array } => {
    const geometry = new THREE.BufferGeometry()
    const positions: number[] = []
    const colors: number[] = []
    let meshCount = 0

    // すべてのメッシュを処理
    gltf.scene.traverse((child: any) => {
      if (child.isMesh) {
        meshCount++
        const mesh = child as THREE.Mesh
        let meshGeometry = mesh.geometry

        // ジオメトリを三角形に変換
        if (!meshGeometry.isBufferGeometry) {
          const tempGeo = new THREE.BufferGeometry()
          tempGeo.fromGeometry(meshGeometry as any)
          meshGeometry = tempGeo
        }

        const positionAttribute = meshGeometry.getAttribute('position')
        const colorAttribute = meshGeometry.getAttribute('color')
        const normalAttribute = meshGeometry.getAttribute('normal')
        const indexAttribute = meshGeometry.getIndex()

        if (!positionAttribute) return

        const positionsArray = positionAttribute.array as Float32Array
        const normalsArray = normalAttribute
          ? (normalAttribute.array as Float32Array)
          : null
        const colorsArray = colorAttribute
          ? (colorAttribute.array as Float32Array)
          : null
        const indicesArray = indexAttribute
          ? (indexAttribute.array as Uint16Array | Uint32Array)
          : null

        // ワールド座標変換
        const worldMatrix = new THREE.Matrix4()
        mesh.updateMatrixWorld(true)
        worldMatrix.copy(mesh.matrixWorld)

        // インデックスがある場合はそれを使用、ない場合は連続した頂点を使用
        const triangleCount = indexAttribute
          ? indexAttribute.count / 3
          : positionsArray.length / 9

        for (let tri = 0; tri < triangleCount; tri++) {
          let i1: number, i2: number, i3: number

          if (indicesArray) {
            i1 = indicesArray[tri * 3] * 3
            i2 = indicesArray[tri * 3 + 1] * 3
            i3 = indicesArray[tri * 3 + 2] * 3
          } else {
            i1 = tri * 9
            i2 = tri * 9 + 3
            i3 = tri * 9 + 6
          }
          const v1 = new THREE.Vector3(
            positionsArray[i1],
            positionsArray[i1 + 1],
            positionsArray[i1 + 2]
          )
          const v2 = new THREE.Vector3(
            positionsArray[i2],
            positionsArray[i2 + 1],
            positionsArray[i2 + 2]
          )
          const v3 = new THREE.Vector3(
            positionsArray[i3],
            positionsArray[i3 + 1],
            positionsArray[i3 + 2]
          )

          // ワールド座標に変換
          v1.applyMatrix4(worldMatrix)
          v2.applyMatrix4(worldMatrix)
          v3.applyMatrix4(worldMatrix)

          // 三角形の面積を計算
          const edge1 = new THREE.Vector3().subVectors(v2, v1)
          const edge2 = new THREE.Vector3().subVectors(v3, v1)
          const area = edge1.cross(edge2).length() / 2

          // 密度に基づいて点の数を決定
          const numPoints = Math.max(1, Math.floor(area * density * 100))

          for (let j = 0; j < numPoints; j++) {
            // バリセントリック座標でランダムな位置を生成
            let u = Math.random()
            let v = Math.random()
            if (u + v > 1) {
              u = 1 - u
              v = 1 - v
            }
            const w = 1 - u - v

            // 点の位置を計算
            const point = new THREE.Vector3()
            point.addScaledVector(v1, u)
            point.addScaledVector(v2, v)
            point.addScaledVector(v3, w)

            // オフセットを適用
            point.x += offset[0]
            point.y += offset[1]
            point.z += offset[2]

            positions.push(point.x, point.y, point.z)

            // 色を取得（頂点色がある場合は補間、ない場合は白）
            if (colorsArray && colorsArray.length > 0) {
              const color1 = new THREE.Color(
                colorsArray[i1],
                colorsArray[i1 + 1],
                colorsArray[i1 + 2]
              )
              const color2 = new THREE.Color(
                colorsArray[i2],
                colorsArray[i2 + 1],
                colorsArray[i2 + 2]
              )
              const color3 = new THREE.Color(
                colorsArray[i3],
                colorsArray[i3 + 1],
                colorsArray[i3 + 2]
              )

              // バリセントリック補間で色を計算
              const r = color1.r * u + color2.r * v + color3.r * w
              const g = color1.g * u + color2.g * v + color3.g * w
              const b = color1.b * u + color2.b * v + color3.b * w

              colors.push(r, g, b)
            } else {
              // 頂点色がない場合はマテリアルの色を使用
              const material = mesh.material as THREE.MeshStandardMaterial
              if (material && material.color) {
                colors.push(material.color.r, material.color.g, material.color.b)
              } else {
                colors.push(1, 1, 1) // デフォルトは白
              }
            }
          }
        }
      }
    })

    console.log(`点群生成: ${meshCount}個のメッシュから${positions.length / 3}個の点を生成`)

    if (positions.length === 0) {
      console.warn('警告: 点が生成されませんでした。メッシュが見つからないか、ジオメトリが空です。')
      // テスト用の点を追加
      for (let i = 0; i < 100; i++) {
        positions.push(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        )
        colors.push(Math.random(), Math.random(), Math.random())
      }
    }

    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3)
    )
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))

    return {
      geometry,
      colors: new Float32Array(colors),
    }
  }

  // 2つの点群間で補間する関数
  const interpolatePointClouds = (
    geom1: THREE.BufferGeometry,
    geom2: THREE.BufferGeometry,
    t: number
  ): THREE.BufferGeometry => {
    const pos1 = geom1.getAttribute('position') as THREE.BufferAttribute
    const pos2 = geom2.getAttribute('position') as THREE.BufferAttribute
    const color1 = geom1.getAttribute('color') as THREE.BufferAttribute
    const color2 = geom2.getAttribute('color') as THREE.BufferAttribute

    const positions: number[] = []
    const colors: number[] = []

    const maxLength = Math.max(pos1.count, pos2.count)

    for (let i = 0; i < maxLength; i++) {
      const idx1 = Math.min(i, pos1.count - 1)
      const idx2 = Math.min(i, pos2.count - 1)

      const p1 = new THREE.Vector3(
        pos1.getX(idx1),
        pos1.getY(idx1),
        pos1.getZ(idx1)
      )
      const p2 = new THREE.Vector3(
        pos2.getX(idx2),
        pos2.getY(idx2),
        pos2.getZ(idx2)
      )

      const p = new THREE.Vector3().lerpVectors(p1, p2, t)
      positions.push(p.x, p.y, p.z)

      const c1 = new THREE.Color(
        color1.getX(idx1),
        color1.getY(idx1),
        color1.getZ(idx1)
      )
      const c2 = new THREE.Color(
        color2.getX(idx2),
        color2.getY(idx2),
        color2.getZ(idx2)
      )

      const c = new THREE.Color().lerpColors(c1, c2, t)
      colors.push(c.r, c.g, c.b)
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3)
    )
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))

    return geometry
  }

  // モデルを読み込む
  useEffect(() => {
    setIsLoading(true)
    setError(null)
    const loader = new GLTFLoader()

    console.log('モデルを読み込み中...', { model1Path, model2Path })

    Promise.all([
      loader.loadAsync(model1Path),
      loader.loadAsync(model2Path),
    ])
      .then(([gltf1, gltf2]) => {
        console.log('モデル読み込み成功', { gltf1, gltf2 })
        try {
          const { geometry: geom1, colors: colors1 } = generatePointCloud(
            gltf1,
            pointDensity,
            model1Position
          )
          const { geometry: geom2, colors: colors2 } = generatePointCloud(
            gltf2,
            pointDensity,
            model2Position
          )

          console.log('点群生成完了', {
            points1: geom1.getAttribute('position').count,
            points2: geom2.getAttribute('position').count,
          })

          setPoints1(geom1)
          setPoints2(geom2)
          setColors(colors1)
          setIsLoading(false)
        } catch (err) {
          console.error('点群生成エラー:', err)
          setError(`点群生成エラー: ${err instanceof Error ? err.message : String(err)}`)
          setIsLoading(false)
        }
      })
      .catch((error) => {
        console.error('モデルの読み込みに失敗しました:', error)
        setError(`モデル読み込みエラー: ${error.message || String(error)}`)
        setIsLoading(false)
      })
  }, [model1Path, model2Path, pointDensity, model1Position, model2Position])

  // アニメーションで点群を更新
  const lastProgressRef = useRef<number>(-1)
  
  useEffect(() => {
    if (pointsRef.current && points1 && points2 && morphProgress !== lastProgressRef.current) {
      const interpolated = interpolatePointClouds(
        points1,
        points2,
        morphProgress
      )
      
      if (geometryRef.current && geometryRef.current !== interpolated) {
        geometryRef.current.dispose()
      }
      
      geometryRef.current = interpolated
      if (pointsRef.current) {
        pointsRef.current.geometry = interpolated
      }
      lastProgressRef.current = morphProgress
    }
  }, [morphProgress, points1, points2])

  if (isLoading) {
    return (
      <mesh>
        <boxGeometry args={[0.1, 0.1, 0.1]} />
        <meshBasicMaterial color="orange" />
      </mesh>
    )
  }

  if (error) {
    return (
      <mesh>
        <boxGeometry args={[1, 0.1, 0.1]} />
        <meshBasicMaterial color="red" />
      </mesh>
    )
  }

  if (!points1 || !points2) {
    return null
  }

  // 初期ジオメトリを生成（初回のみ）
  if (!geometryRef.current) {
    geometryRef.current = interpolatePointClouds(points1, points2, morphProgress)
  }

  const pointCount = geometryRef.current.getAttribute('position').count
  if (pointCount > 0) {
    console.log('レンダリング:', { pointCount, morphProgress })
  }

  return (
    <points ref={pointsRef} geometry={geometryRef.current}>
      <pointsMaterial
        vertexColors
        size={pointSize}
        transparent={false}
        opacity={1}
        sizeAttenuation={true}
        depthWrite={true}
      />
    </points>
  )
}
