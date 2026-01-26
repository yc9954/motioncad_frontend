// Hand gesture control system for 3D object manipulation
// Based on JARVIS 3D Hand Gesture Control

import { OneEuroFilter } from './one-euro-filter';
import { isPinching, isSpiderman, Landmark, WorldLandmark } from './gesture-recognition';

export interface GestureState {
  worldReferenceDistance: number;
  lastScaleDist: number;
  isRotating: boolean;
  lastRotationPos: { x: number; y: number };
  targetPosition: { x: number; y: number; z: number };
  targetScale: number;
  rotationX: number;
  rotationY: number;
  filters: {
    x: OneEuroFilter;
    y: OneEuroFilter;
    z: OneEuroFilter;
  };
  poolVector: { x: number; y: number; z: number };
  // 핀치 시작 시점의 손 위치와 객체 위치 저장
  initialPinchPosition: { x: number; y: number; z: number } | null;
  initialObjectPosition: { x: number; y: number; z: number } | null;
  isPinching: boolean;
}

export interface GestureConfig {
  baseOffset: number;      // 0.3~0.5
  sensitivity: {
    depth: number;         // 3.0~4.0
    scale: number;
    rotate: number;
  };
  minZ: number;            // 0.2~0.3
  maxZ: number;            // 0.85~0.98
}

const defaultConfig: GestureConfig = {
  baseOffset: 0.4,
  sensitivity: {
    depth: 3.5,
    scale: 1.0,
    rotate: 1.0,
  },
  minZ: 0.25,
  maxZ: 0.85,
};

export class HandGestureController {
  private state: GestureState;
  private config: GestureConfig;
  private camera: any; // Three.js Camera

  constructor(camera: any, config: Partial<GestureConfig> = {}) {
    this.camera = camera;
    this.config = { ...defaultConfig, ...config };
    
    this.state = {
      worldReferenceDistance: 0.1,
      lastScaleDist: 0,
      isRotating: false,
      lastRotationPos: { x: 0, y: 0 },
      targetPosition: { x: 0, y: 0, z: 0 },
      targetScale: 1.0,
      rotationX: 0,
      rotationY: 0,
      filters: {
        x: new OneEuroFilter(30, 1.0, 0.007),
        y: new OneEuroFilter(30, 1.0, 0.007),
        z: new OneEuroFilter(30, 1.0, 0.007),
      },
      poolVector: { x: 0, y: 0, z: 0 },
      initialPinchPosition: null,
      initialObjectPosition: null,
      isPinching: false,
    };
  }

  // Method A: Dynamic Z calculation based on hand distance
  private calculateDynamicZ(
    landmarks: Landmark[],
    worldLandmarks: WorldLandmark[]
  ): number {
    const wrist = landmarks[0];
    const middleMCP = landmarks[9];

    // Initialize reference distance (first time only)
    if (!this.state.worldReferenceDistance || this.state.worldReferenceDistance === 0.1) {
      const w0 = worldLandmarks[0];
      const w9 = worldLandmarks[9];
      this.state.worldReferenceDistance = Math.sqrt(
        Math.pow(w0.x - w9.x, 2) +
        Math.pow(w0.y - w9.y, 2) +
        Math.pow(w0.z - w9.z, 2)
      );
    }

    // Calculate current 2D distance
    const current2DDist = Math.hypot(
      landmarks[0].x - landmarks[9].x,
      landmarks[0].y - landmarks[9].y
    );

    // Calculate difference and Z coordinate
    const diff = this.state.worldReferenceDistance - current2DDist;
    const zNDC = Math.max(
      this.config.minZ,
      Math.min(
        this.config.maxZ,
        this.config.baseOffset - diff * this.config.sensitivity.depth
      )
    );

    return zNDC;
  }

  // Handle movement (Single Pinch)
  handleMovement(
    landmarks: Landmark[],
    worldLandmarks: WorldLandmark[],
    currentObjectPosition?: { x: number; y: number; z: number }
  ): { x: number; y: number; z: number } | null {
    if (!isPinching(landmarks)) {
      // 핀치가 끝났으면 초기화
      if (this.state.isPinching) {
        this.state.isPinching = false;
        this.state.initialPinchPosition = null;
        this.state.initialObjectPosition = null;
      }
      return null;
    }

    const middleMCP = landmarks[9];
    const zNDC = this.calculateDynamicZ(landmarks, worldLandmarks);

    // 3D Unprojection
    const ndcX = (1 - middleMCP.x) * 2 - 1;
    const ndcY = -(middleMCP.y * 2 - 1);
    
    this.state.poolVector = { x: ndcX, y: ndcY, z: zNDC };
    
    // Unproject to world coordinates
    if (!(window as any).THREE) {
      console.error('[Hand Gesture] Three.js not loaded');
      return null;
    }
    
    const THREE = (window as any).THREE;
    const vector = new THREE.Vector3(
      this.state.poolVector.x,
      this.state.poolVector.y,
      this.state.poolVector.z
    );
    vector.unproject(this.camera);

    // Apply 1€ Filter
    const timestamp = performance.now();
    const filteredX = this.state.filters.x.filter(vector.x, timestamp);
    const filteredY = this.state.filters.y.filter(vector.y, timestamp);
    const filteredZ = this.state.filters.z.filter(vector.z, timestamp);

    const currentHandPosition = { x: filteredX, y: filteredY, z: filteredZ };

    // 핀치가 시작될 때 초기 위치 저장
    if (!this.state.isPinching) {
      this.state.isPinching = true;
      this.state.initialPinchPosition = { ...currentHandPosition };
      // 객체의 현재 위치를 초기 위치로 저장
      if (currentObjectPosition) {
        this.state.initialObjectPosition = { ...currentObjectPosition };
      } else {
        // 객체 위치가 제공되지 않으면 손 위치를 기준으로 설정
        this.state.initialObjectPosition = { ...currentHandPosition };
      }
    }

    // 상대적 이동량 계산
    if (this.state.initialPinchPosition && this.state.initialObjectPosition) {
      const deltaX = currentHandPosition.x - this.state.initialPinchPosition.x;
      const deltaY = currentHandPosition.y - this.state.initialPinchPosition.y;
      const deltaZ = currentHandPosition.z - this.state.initialPinchPosition.z;

      // 초기 객체 위치에서 상대적 이동량을 더함
      this.state.targetPosition = {
        x: this.state.initialObjectPosition.x + deltaX,
        y: this.state.initialObjectPosition.y + deltaY,
        z: this.state.initialObjectPosition.z + deltaZ,
      };
    } else {
      // 초기 위치가 없으면 절대 위치 사용 (폴백)
      this.state.targetPosition = currentHandPosition;
    }

    return this.state.targetPosition;
  }

  // Handle scaling (Double Pinch)
  handleScaling(
    hand1Landmarks: Landmark[],
    hand2Landmarks: Landmark[]
  ): number | null {
    if (!isPinching(hand1Landmarks) || !isPinching(hand2Landmarks)) {
      return null;
    }

    const h1 = hand1Landmarks[9]; // First hand middle MCP
    const h2 = hand2Landmarks[9]; // Second hand middle MCP
    const dist = Math.hypot(h1.x - h2.x, h1.y - h2.y);

    if (this.state.lastScaleDist === 0) {
      this.state.lastScaleDist = dist;
      return null;
    }

    const delta = dist - this.state.lastScaleDist;
    this.state.lastScaleDist = dist;

    const scaleFactor = 1 + (delta * this.config.sensitivity.scale * 3);
    let newScale = this.state.targetScale * scaleFactor;
    newScale = Math.max(0.2, Math.min(newScale, 5.0)); // Clamp
    this.state.targetScale = newScale;

    return this.state.targetScale;
  }

  // Handle rotation (Spider-Man gesture)
  handleRotation(landmarks: Landmark[]): { x: number; y: number } | null {
    if (!isSpiderman(landmarks)) {
      this.state.isRotating = false;
      return null;
    }

    const wrist = landmarks[0];
    const xPos = (1 - wrist.x) * 2 - 1;
    const yPos = -(wrist.y * 2 - 1);

    if (!this.state.isRotating) {
      this.state.isRotating = true;
      this.state.lastRotationPos = { x: xPos, y: yPos };
      return null;
    }

    const dx = xPos - this.state.lastRotationPos.x;
    const dy = yPos - this.state.lastRotationPos.y;

    const speed = 4.0 * this.config.sensitivity.rotate;
    this.state.rotationY += dx * speed; // Left-right movement → Y-axis rotation
    this.state.rotationX += dy * speed; // Up-down movement → X-axis rotation

    this.state.lastRotationPos = { x: xPos, y: yPos };

    return { x: this.state.rotationX, y: this.state.rotationY };
  }

  // Reset state
  reset(): void {
    this.state.worldReferenceDistance = 0.1;
    this.state.lastScaleDist = 0;
    this.state.isRotating = false;
    this.state.targetPosition = { x: 0, y: 0, z: 0 };
    this.state.targetScale = 1.0;
    this.state.rotationX = 0;
    this.state.rotationY = 0;
    this.state.filters.x.reset();
    this.state.filters.y.reset();
    this.state.filters.z.reset();
    this.state.initialPinchPosition = null;
    this.state.initialObjectPosition = null;
    this.state.isPinching = false;
  }

  // Get current state
  getState(): GestureState {
    return { ...this.state };
  }

  // Update camera reference
  setCamera(camera: any): void {
    this.camera = camera;
  }
}
