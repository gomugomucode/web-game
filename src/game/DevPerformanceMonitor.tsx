'use client';

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { otterTelemetry } from './telemetry';

/**
 * DevPerformanceMonitor (Milestone 9)
 * Reads real renderer stats (calls, triangles) and computes smoothed FPS over ~0.5s window.
 * Stores values in decoupled telemetry object with zero allocations and no React tree re-renders.
 */
export function DevPerformanceMonitor() {
  const { gl } = useThree();
  const perfRef = useRef({
    frameCount: 0,
    timeAccum: 0,
  });

  useFrame((_, delta) => {
    // 1. Capture exact renderer statistics from the completed frame
    otterTelemetry.drawCalls = gl.info.render.calls;
    otterTelemetry.triangles = gl.info.render.triangles;

    // 2. Smooth FPS over ~0.5 second window
    const p = perfRef.current;
    p.frameCount++;
    p.timeAccum += delta;

    if (p.timeAccum >= 0.5) {
      otterTelemetry.fps = Math.round(p.frameCount / p.timeAccum);
      p.frameCount = 0;
      p.timeAccum = 0;
    }
  });

  return null;
}
