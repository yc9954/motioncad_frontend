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
  // 핀치 드래그 중인지 추적 (애니메이션 루프에서 즉시 업데이트 여부 결정)
  isDragging: boolean;
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
        // 드래그 반응성을 높이기 위해 필터 파라미터 조정
        // mincutoff를 낮추고 beta를 높여서 빠른 움직임에 더 잘 반응하도록
        x: new OneEuroFilter(30, 0.8, 0.01),
        y: new OneEuroFilter(30, 0.8, 0.01),
        z: new OneEuroFilter(30, 0.8, 0.01),
      },
      poolVector: { x: 0, y: 0, z: 0 },
      initialPinchPosition: null,
      initialObjectPosition: null,
      isPinching: false,
      isDragging: false,
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
    // World landmarks를 사용하여 3D 거리 측정
    if (!this.state.worldReferenceDistance || this.state.worldReferenceDistance === 0.1) {
      const w0 = worldLandmarks[0];
      const w9 = worldLandmarks[9];
      this.state.worldReferenceDistance = Math.sqrt(
        Math.pow(w0.x - w9.x, 2) +
        Math.pow(w0.y - w9.y, 2) +
        Math.pow(w0.z - w9.z, 2)
      );
      console.log('[Hand Gesture] World reference distance initialized:', this.state.worldReferenceDistance);
    }

    // Calculate current 2D screen distance (normalized 0-1)
    const current2DDist = Math.hypot(
      landmarks[0].x - landmarks[9].x,
      landmarks[0].y - landmarks[9].y
    );

    // Calculate current 3D world distance for comparison
    const w0 = worldLandmarks[0];
    const w9 = worldLandmarks[9];
    const current3DDist = Math.sqrt(
      Math.pow(w0.x - w9.x, 2) +
      Math.pow(w0.y - w9.y, 2) +
      Math.pow(w0.z - w9.z, 2)
    );

    // 2D 거리 차이를 사용하여 깊이 계산
    // 손이 가까워지면 2D 거리가 커지고, 멀어지면 작아짐
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
        this.state.isDragging = false; // 드래그 종료
        this.state.initialPinchPosition = null;
        this.state.initialObjectPosition = null;
      }
      return null;
    }

    const middleMCP = landmarks[9];
    const wrist = landmarks[0];
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

    // 핀치가 시작될 때 초기 위치 저장 (드래그 시작 전)
    if (!this.state.isPinching) {
      this.state.isPinching = true;
      this.state.isDragging = false; // 아직 드래그 시작 전
      this.state.initialPinchPosition = { ...currentHandPosition };
      // 객체의 현재 위치를 초기 위치로 저장
      if (currentObjectPosition) {
        this.state.initialObjectPosition = { ...currentObjectPosition };
      } else {
        // 객체 위치가 제공되지 않으면 손 위치를 기준으로 설정
        this.state.initialObjectPosition = { ...currentHandPosition };
      }
      // 핀치 시작 시점에서는 객체를 움직이지 않음
      return null;
    }

    // 핀치가 진행 중일 때: 손이 실제로 움직였는지 확인하여 드래그 시작
    if (!this.state.isDragging && this.state.initialPinchPosition) {
      // 손이 일정 거리 이상 움직였을 때만 드래그 시작
      // 임계값을 낮춰서 좌우 드래그가 더 잘 감지되도록 함
      const movementThreshold = 0.005; // 움직임 임계값 (미터 단위, 더 낮게 설정)
      const deltaX = currentHandPosition.x - this.state.initialPinchPosition.x;
      const deltaY = currentHandPosition.y - this.state.initialPinchPosition.y;
      const deltaZ = currentHandPosition.z - this.state.initialPinchPosition.z;
      const movementDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ);
      
      if (movementDistance > movementThreshold) {
        // 손이 움직였으므로 드래그 시작
        this.state.isDragging = true;
        console.log('[Hand Gesture] Drag started, movement distance:', movementDistance);
      } else {
        // 아직 움직이지 않았으므로 드래그 시작하지 않음
        return null;
      }
    }

    // 드래그가 활성화된 경우에만 위치 업데이트
    if (!this.state.isDragging || !this.state.initialPinchPosition || !this.state.initialObjectPosition) {
      return null;
    }

    // 상대적 이동량 계산 (원근법 보정 포함)
    // 카메라 위치 가져오기
    const cameraPos = new THREE.Vector3();
    this.camera.getWorldPosition(cameraPos);
    
    // 손의 현재 깊이와 초기 깊이 계산 (카메라로부터의 거리)
    const currentHandDepth = Math.abs(currentHandPosition.z - cameraPos.z);
    const initialHandDepth = Math.abs(this.state.initialPinchPosition.z - cameraPos.z);
    
    // 원근법 보정: 깊이에 따라 이동 거리 스케일링
    // 손이 가까울수록(작은 depth) 작게, 멀수록(큰 depth) 크게 움직이도록 조정
    const depthScale = Math.max(0.3, Math.min(3.0, currentHandDepth / Math.max(initialHandDepth, 0.01)));
    
    // 3D 월드 좌표에서의 이동량 계산
    const deltaX = currentHandPosition.x - this.state.initialPinchPosition.x;
    const deltaY = currentHandPosition.y - this.state.initialPinchPosition.y;
    const deltaZ = currentHandPosition.z - this.state.initialPinchPosition.z;
    
    // 원근법 보정 적용: 깊이에 따라 이동 거리 스케일링
    const correctedDeltaX = deltaX * depthScale;
    const correctedDeltaY = deltaY * depthScale;
    const correctedDeltaZ = deltaZ; // Z는 깊이 자체이므로 스케일링하지 않음

    // 초기 객체 위치에서 상대적 이동량을 더함
    this.state.targetPosition = {
      x: this.state.initialObjectPosition.x + correctedDeltaX,
      y: this.state.initialObjectPosition.y + correctedDeltaY,
      z: this.state.initialObjectPosition.z + correctedDeltaZ,
    };

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
    this.state.isDragging = false;
  }

  // Get dragging state
  isDraggingActive(): boolean {
    return this.state.isDragging;
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
