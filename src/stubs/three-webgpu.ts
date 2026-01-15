// Stub for three/webgpu since it's not available in the main three.js bundle
// The 3d-force-graph library checks for WebGPU support at runtime but falls back to WebGL
import { WebGLRenderer } from 'three';

// Export WebGPURenderer as an alias to WebGLRenderer
// This is safe because the library does runtime capability detection
export const WebGPURenderer = WebGLRenderer;
