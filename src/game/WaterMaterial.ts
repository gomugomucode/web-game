'use client';

import * as THREE from 'three';
import { GAME_CONSTANTS } from './constants';

const vertexShader = /* glsl */ `
#include <fog_pars_vertex>

varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vViewPosition;
varying vec3 vNormal;

void main() {
  vUv = uv;
  #include <beginnormal_vertex>
  #include <defaultnormal_vertex>
  vNormal = normalize(transformedNormal);
  #include <begin_vertex>
  #include <project_vertex>
  vViewPosition = -mvPosition.xyz;
  vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  #include <fog_vertex>
}
`;

const fragmentShader = /* glsl */ `
#include <fog_pars_fragment>

uniform float uTime;
uniform vec3 uColorDeep;
uniform vec3 uColorShallow;
uniform vec3 uColorFoam;
uniform vec3 uSunDirection;
uniform vec3 uSunColor;

varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vViewPosition;
varying vec3 vNormal;

void main() {
  float u = vUv.x;
  float v = vUv.y;

  // 1. Downstream ripples (traveling in +v direction)
  float r1 = sin(v * 14.0 - uTime * 3.0 + sin(u * 6.0) * 0.4);
  float r2 = sin((v * 18.0 + u * 6.0) - uTime * 3.6);
  float r3 = cos(u * 10.0 - v * 5.0 + uTime * 1.2);
  float wave = (r1 * 0.5 + r2 * 0.35 + r3 * 0.15) * 0.5 + 0.5;

  // 2. Downstream foam lines and streamlines
  float foamFlow = sin(u * 26.0 + sin(v * 8.0 - uTime * 2.2) * 1.5);
  float foamSegment = sin(v * 5.0 - uTime * 3.2);
  float downstreamFoam = smoothstep(0.85, 0.95, foamFlow) * smoothstep(0.2, 0.7, foamSegment);

  // Shoreline foam fringe along the riverbanks (u -> 0 and u -> 1)
  float edgeDist = min(u, 1.0 - u);
  float edgeNoise = sin(v * 16.0 - uTime * 2.0) * 0.015 + sin(v * 32.0 - uTime * 3.5) * 0.008;
  float shoreFoam = smoothstep(0.08 + edgeNoise, 0.02 + edgeNoise, edgeDist);

  // Gentle wave crest foam highlights
  float crestFoam = smoothstep(0.78, 0.88, wave) * 0.45;

  // Combined stylized anime foam
  float totalFoam = clamp(shoreFoam * 0.85 + downstreamFoam * 0.65 + crestFoam, 0.0, 1.0);

  // 3. Normal perturbation and cel-shaded sun specular glint
  vec3 normal = normalize(vec3((r2 - r3) * 0.12, 1.0, (r1 - r2) * 0.16));
  vec3 viewDir = normalize(vViewPosition);
  vec3 halfVec = normalize(uSunDirection + viewDir);
  float NdotH = max(dot(normal, halfVec), 0.0);
  float specular = smoothstep(0.92, 0.97, pow(NdotH, 32.0));

  // 4. Color blending
  vec3 waterColor = mix(uColorDeep, uColorShallow, wave * 0.65);
  waterColor += uSunColor * specular * 0.35;
  vec3 finalColor = mix(waterColor, uColorFoam, totalFoam);

  gl_FragColor = vec4(finalColor, 1.0);

  #include <fog_fragment>
}
`;

/**
 * Creates an animated water shader material for the procedural river ribbon (Milestone 6).
 * Opaque with depthWrite: true to guarantee correct draw order with banks and ground plane.
 */
export function createWaterMaterial(): THREE.ShaderMaterial {
  const sunDirection = new THREE.Vector3(60, 80, -40).normalize();

  return new THREE.ShaderMaterial({
    fog: true,
    uniforms: {
      ...THREE.UniformsUtils.merge([THREE.UniformsLib.fog]),
      uTime: { value: 0 },
      uColorDeep: { value: new THREE.Color(GAME_CONSTANTS.WATER_COLOR) },
      uColorShallow: { value: new THREE.Color(GAME_CONSTANTS.WATER_SURFACE_COLOR) },
      uColorFoam: { value: new THREE.Color('#e0f2fe') },
      uSunDirection: { value: sunDirection },
      uSunColor: { value: new THREE.Color('#fffbeb') },
    },
    vertexShader,
    fragmentShader,
    depthWrite: true,
    depthTest: true,
    transparent: false,
  });
}

/**
 * Shared singleton animated water material instance to avoid per-render allocations
 */
export const sharedWaterMaterial = createWaterMaterial();
