'use client';

import * as THREE from 'three';

/**
 * Shared 3-step gradient map for MeshToonMaterial (Milestone 6)
 * Produces crisp, authentic anime/cel-shading lighting bands using a 3x1 DataTexture with NearestFilter.
 * Shared across all toon materials to prevent redundant texture allocation.
 */
function createThreeStepGradientMap(): THREE.DataTexture {
  // 3 distinct steps: Shadow band, Midtone band, Lit Highlight band
  const data = new Uint8Array([
    110, 110, 110, 255, // Step 0: Shadow / unlit zone (N·L < 0.33)
    190, 190, 190, 255, // Step 1: Midtone zone (0.33 <= N·L < 0.67)
    255, 255, 255, 255, // Step 2: Full highlight zone (N·L >= 0.67)
  ]);

  const texture = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

export const threeStepGradientMap = createThreeStepGradientMap();
