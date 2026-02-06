'use client'

import { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

export default function OrbitControlsWrapper(props: {
  enableDamping?: boolean
  dampingFactor?: number
}) {
  const { camera, gl } = useThree()
  const controlsRef = useRef<OrbitControls | null>(null)

  useEffect(() => {
    if (!controlsRef.current) {
      controlsRef.current = new OrbitControls(camera, gl.domElement)
      controlsRef.current.enableDamping = props.enableDamping ?? true
      controlsRef.current.dampingFactor = props.dampingFactor ?? 0.05
    }

    return () => {
      if (controlsRef.current) {
        controlsRef.current.dispose()
      }
    }
  }, [camera, gl, props.enableDamping, props.dampingFactor])

  useFrame(() => {
    if (controlsRef.current) {
      controlsRef.current.update()
    }
  })

  return null
}
