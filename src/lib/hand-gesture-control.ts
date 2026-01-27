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
  // 더블 핀치(스케일링) 상태 추적
  isDoublePinching: boolean;
  initialScale: number;
  // 카메라 기준 좌표계를 위한 초기 NDC 좌표
  initialNDC: { x: number; y: number; z: number } | null;
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
        // 드래그 반응성과 부드러움의 균형
        // mincutoff: 0.7 (너무 높으면 지터 발생, 너무 낮으면 지연), beta: 0.6 (빠른 움직임에 반응)
        // Y축은 수직 움직임이 더 자연스럽도록 약간 다른 파라미터 사용
        x: new OneEuroFilter(30, 0.7, 0.6),
        y: new OneEuroFilter(30, 0.8, 0.7), // Y축은 더 부드럽게
        z: new OneEuroFilter(30, 0.6, 0.4),
      },
      poolVector: { x: 0, y: 0, z: 0 },
      initialPinchPosition: null,
      initialObjectPosition: null,
      isPinching: false,
      isDragging: false,
      isDoublePinching: false,
      initialScale: 1.0,
      initialNDC: null,
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
  // 카메라 기준 좌표계: 맵을 회전시켜도 웹캠 방향 기준으로 움직임 유지
  handleMovement(
    landmarks: Landmark[],
    worldLandmarks: WorldLandmark[],
    currentObjectPosition?: { x: number; y: number; z: number }
  ): { x: number; y: number; z: number } | null {
    if (!isPinching(landmarks)) {
      // 핀치가 끝났으면 초기화
      if (this.state.isPinching) {
        this.state.isPinching = false;
        this.state.isDragging = false;
        this.state.initialPinchPosition = null;
        this.state.initialObjectPosition = null;
        this.state.initialNDC = null;
      }
      return null;
    }

    // 싱글 핀치일 때는 스케일링 상태를 명확히 리셋 (의도치 않은 스케일링 방지)
    if (this.state.isDoublePinching) {
      this.state.isDoublePinching = false;
      this.state.lastScaleDist = 0;
      this.state.targetScale = 1.0;
    }

    const middleMCP = landmarks[9];
    const zNDC = this.calculateDynamicZ(landmarks, worldLandmarks);

    // NDC 좌표 계산 (화면 기준 -1 ~ 1)
    const ndcX = (1 - middleMCP.x) * 2 - 1;
    const ndcY = -(middleMCP.y * 2 - 1);

    if (!(window as any).THREE) {
      console.error('[Hand Gesture] Three.js not loaded');
      return null;
    }

    const THREE = (window as any).THREE;

    // 핀치가 시작될 때 초기화
    if (!this.state.isPinching) {
      // 필터를 raw 값으로 리셋 (초기값을 raw 값으로 설정)
      this.state.filters.x.resetWithValue(ndcX);
      this.state.filters.y.resetWithValue(ndcY);
      this.state.filters.z.resetWithValue(zNDC);

      this.state.isPinching = true;
      this.state.isDragging = false;

      // 필터를 한 번 적용하여 안정화된 초기값 얻기
      const timestamp = performance.now();
      const filteredNdcX = this.state.filters.x.filter(ndcX, timestamp);
      const filteredNdcY = this.state.filters.y.filter(ndcY, timestamp);
      const filteredNdcZ = this.state.filters.z.filter(zNDC, timestamp);

      // 필터된 초기 NDC 좌표 저장
      this.state.initialNDC = { x: filteredNdcX, y: filteredNdcY, z: filteredNdcZ };

      // 객체의 현재 위치를 초기 위치로 저장 (정확한 현재 위치 사용)
      if (currentObjectPosition) {
        this.state.initialObjectPosition = { ...currentObjectPosition };
      } else {
        this.state.initialObjectPosition = { x: 0, y: 0, z: 0 };
      }

      // 디버그 로그 제거 (성능 개선)
      return null;
    }

    // Apply 1€ Filter to NDC coordinates
    const timestamp = performance.now();
    const filteredNdcX = this.state.filters.x.filter(ndcX, timestamp);
    const filteredNdcY = this.state.filters.y.filter(ndcY, timestamp);
    const filteredNdcZ = this.state.filters.z.filter(zNDC, timestamp);

    // 핀치가 진행 중일 때: 손이 실제로 움직였는지 확인하여 드래그 시작
    if (!this.state.isDragging && this.state.initialNDC) {
      const ndcDeltaX = filteredNdcX - this.state.initialNDC.x;
      const ndcDeltaY = filteredNdcY - this.state.initialNDC.y;
      const ndcMovement = Math.sqrt(ndcDeltaX * ndcDeltaX + ndcDeltaY * ndcDeltaY);

      // NDC 기준 임계값 (화면 비율로 약 1% 정도) - 좌우 움직임을 더 잘 감지
      if (ndcMovement > 0.02) {
        this.state.isDragging = true;
        // 드래그 시작 시 initialNDC와 initialObjectPosition을 현재 값으로 업데이트 (점프 방지)
        // 이렇게 하면 드래그 시작 시점부터 상대적 이동만 계산됨
        this.state.initialNDC = { x: filteredNdcX, y: filteredNdcY, z: filteredNdcZ };
        if (currentObjectPosition) {
          this.state.initialObjectPosition = { ...currentObjectPosition };
        }
        // 디버그 로그 제거 (성능 개선)
      } else {
        return null;
      }
    }

    if (!this.state.isDragging || !this.state.initialNDC || !this.state.initialObjectPosition) {
      return null;
    }

    // 화면 기준 이동량 계산 (NDC delta)
    const ndcDeltaX = filteredNdcX - this.state.initialNDC.x;
    const ndcDeltaY = filteredNdcY - this.state.initialNDC.y;
    const ndcDeltaZ = filteredNdcZ - this.state.initialNDC.z;

    // 카메라의 right, up, forward 벡터 가져오기
    // 카메라의 로컬 좌표계를 월드 좌표계로 변환
    const cameraRight = new THREE.Vector3(1, 0, 0);
    const cameraUp = new THREE.Vector3(0, 1, 0);
    const cameraForward = new THREE.Vector3(0, 0, -1);

    // 카메라의 회전 행렬을 사용하여 로컬 벡터를 월드 벡터로 변환
    const cameraMatrix = new THREE.Matrix4();
    cameraMatrix.extractRotation(this.camera.matrixWorld);
    
    cameraRight.applyMatrix4(cameraMatrix);
    cameraUp.applyMatrix4(cameraMatrix);
    cameraForward.applyMatrix4(cameraMatrix);
    
    cameraRight.normalize();
    cameraUp.normalize();
    cameraForward.normalize();

    // 이동 거리 스케일 (카메라와 객체 사이 거리에 따라 조정)
    const cameraPos = new THREE.Vector3();
    this.camera.getWorldPosition(cameraPos);
    const objPos = new THREE.Vector3(
      this.state.initialObjectPosition.x,
      this.state.initialObjectPosition.y,
      this.state.initialObjectPosition.z
    );
    const distanceToObject = cameraPos.distanceTo(objPos);
    // 거리에 비례한 이동량, 좌우 움직임을 더 잘 반영하도록 스케일 조정
    const movementScale = distanceToObject * 1.2;

    // 카메라 기준 좌표계로 이동량 계산
    // 화면의 좌우 이동 -> 카메라의 right 방향 (웹캠 기준)
    // 화면의 상하 이동 -> 카메라의 up 방향 (웹캠 기준, 수직 방향 개선)
    // 화면의 전후 이동 -> 카메라의 forward 방향 (웹캠 기준)
    // Y축(수직) 움직임을 더 자연스럽게 하기 위해 스케일 조정
    const worldDeltaX = cameraRight.x * ndcDeltaX * movementScale * 1.3 +
                        cameraUp.x * ndcDeltaY * movementScale * 1.4 + // Y축 스케일 증가
                        cameraForward.x * ndcDeltaZ * movementScale * 2;
    const worldDeltaY = cameraRight.y * ndcDeltaX * movementScale * 1.3 +
                        cameraUp.y * ndcDeltaY * movementScale * 1.4 + // Y축 스케일 증가
                        cameraForward.y * ndcDeltaZ * movementScale * 2;
    const worldDeltaZ = cameraRight.z * ndcDeltaX * movementScale * 1.3 +
                        cameraUp.z * ndcDeltaY * movementScale * 1.4 + // Y축 스케일 증가
                        cameraForward.z * ndcDeltaZ * movementScale * 2;

    // 초기 객체 위치에서 카메라 기준 이동량을 더함
    this.state.targetPosition = {
      x: this.state.initialObjectPosition.x + worldDeltaX,
      y: this.state.initialObjectPosition.y + worldDeltaY,
      z: this.state.initialObjectPosition.z + worldDeltaZ,
    };

    return this.state.targetPosition;
  }

  // Handle scaling (Double Pinch)
  handleScaling(
    hand1Landmarks: Landmark[],
    hand2Landmarks: Landmark[],
    currentObjectScale?: number
  ): number | null {
    if (!isPinching(hand1Landmarks) || !isPinching(hand2Landmarks)) {
      // 더블 핀치가 끝나면 상태 리셋
      if (this.state.isDoublePinching) {
        this.state.isDoublePinching = false;
        this.state.lastScaleDist = 0;
      }
      return null;
    }

    // 더블 핀치일 때는 싱글 핀치 상태를 리셋
    if (this.state.isPinching) {
      this.state.isPinching = false;
      this.state.isDragging = false;
      this.state.initialPinchPosition = null;
      this.state.initialObjectPosition = null;
      this.state.initialNDC = null;
    }

    const h1 = hand1Landmarks[9]; // First hand middle MCP
    const h2 = hand2Landmarks[9]; // Second hand middle MCP
    const dist = Math.hypot(h1.x - h2.x, h1.y - h2.y);

    // 더블 핀치가 새로 시작될 때 초기화
    if (!this.state.isDoublePinching) {
      this.state.isDoublePinching = true;
      this.state.lastScaleDist = dist;
      // 현재 객체의 스케일을 초기 스케일로 저장 (명시적으로 전달된 값 우선)
      if (currentObjectScale !== undefined && currentObjectScale > 0) {
        this.state.initialScale = currentObjectScale;
      } else if (this.state.targetScale > 0) {
        this.state.initialScale = this.state.targetScale;
      } else {
        this.state.initialScale = 1.0;
      }
      this.state.targetScale = this.state.initialScale;
      // 디버그 로그 제거 (성능 개선)
      return null;
    }

    // 초기 거리 대비 현재 거리의 비율로 스케일 계산
    const initialDist = this.state.lastScaleDist;
    if (initialDist === 0 || initialDist < 0.01) {
      // 거리가 너무 작으면 초기화
      this.state.lastScaleDist = dist;
      return null;
    }

    const scaleRatio = dist / initialDist;
    let newScale = this.state.initialScale * scaleRatio;
    newScale = Math.max(0.2, Math.min(newScale, 5.0)); // Clamp
    this.state.targetScale = newScale;

    // 디버그 로그 제거 (성능 개선)
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
    this.state.isDoublePinching = false;
    this.state.initialScale = 1.0;
    this.state.initialNDC = null;
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
