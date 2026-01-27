// Gesture recognition utilities based on MediaPipe Hands landmarks

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export interface WorldLandmark {
  x: number;
  y: number;
  z: number;
}

// Calculate distance between two landmarks
function dist(a: Landmark, b: Landmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Check if user is pinching (thumb and index finger together)
// 히스테리시스를 사용하여 더 안정적인 감지
let lastPinchState = false;
let pinchConfidence = 0;

export function isPinching(landmarks: Landmark[]): boolean {
  if (landmarks.length < 9) {
    lastPinchState = false;
    pinchConfidence = 0;
    return false;
  }
  
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const distance = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
  
  // 히스테리시스: ON 임계값 0.06, OFF 임계값 0.08
  // 이렇게 하면 작은 진동으로 인한 깜빡임 방지
  const ON_THRESHOLD = 0.06;
  const OFF_THRESHOLD = 0.08;
  
  if (lastPinchState) {
    // 현재 핀치 상태인 경우, OFF 임계값보다 커야 해제
    if (distance > OFF_THRESHOLD) {
      pinchConfidence = Math.max(0, pinchConfidence - 0.2);
      if (pinchConfidence <= 0) {
        lastPinchState = false;
      }
    } else {
      pinchConfidence = Math.min(1.0, pinchConfidence + 0.3);
    }
  } else {
    // 현재 핀치가 아닌 경우, ON 임계값보다 작아야 시작
    if (distance < ON_THRESHOLD) {
      pinchConfidence = Math.min(1.0, pinchConfidence + 0.3);
      if (pinchConfidence >= 0.7) {
        lastPinchState = true;
      }
    } else {
      pinchConfidence = Math.max(0, pinchConfidence - 0.2);
    }
  }
  
  return lastPinchState;
}

// Check for Spider-Man gesture (index and pinky up, middle and ring down)
export function isSpiderman(landmarks: Landmark[]): boolean {
  if (landmarks.length < 21) return false;
  const wrist = landmarks[0];
  
  const indexUp = dist(landmarks[8], wrist) > dist(landmarks[6], wrist);
  const pinkyUp = dist(landmarks[20], wrist) > dist(landmarks[18], wrist);
  const middleDown = dist(landmarks[12], wrist) < dist(landmarks[10], wrist);
  const ringDown = dist(landmarks[16], wrist) < dist(landmarks[14], wrist);
  
  return indexUp && pinkyUp && middleDown && ringDown;
}

// Check if hand is open (all fingers extended)
export function isOpenPalm(landmarks: Landmark[]): boolean {
  if (landmarks.length < 21) return false;
  const wrist = landmarks[0];
  
  const thumbUp = dist(landmarks[4], wrist) > dist(landmarks[3], wrist);
  const indexUp = dist(landmarks[8], wrist) > dist(landmarks[6], wrist);
  const middleUp = dist(landmarks[12], wrist) > dist(landmarks[10], wrist);
  const ringUp = dist(landmarks[16], wrist) > dist(landmarks[14], wrist);
  const pinkyUp = dist(landmarks[20], wrist) > dist(landmarks[18], wrist);
  
  return thumbUp && indexUp && middleUp && ringUp && pinkyUp;
}

// Check if hand is closed (fist)
export function isFist(landmarks: Landmark[]): boolean {
  if (landmarks.length < 21) return false;
  const wrist = landmarks[0];
  
  const thumbDown = dist(landmarks[4], wrist) < dist(landmarks[3], wrist);
  const indexDown = dist(landmarks[8], wrist) < dist(landmarks[6], wrist);
  const middleDown = dist(landmarks[12], wrist) < dist(landmarks[10], wrist);
  const ringDown = dist(landmarks[16], wrist) < dist(landmarks[14], wrist);
  const pinkyDown = dist(landmarks[20], wrist) < dist(landmarks[18], wrist);
  
  return thumbDown && indexDown && middleDown && ringDown && pinkyDown;
}
