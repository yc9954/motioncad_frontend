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
export function isPinching(landmarks: Landmark[]): boolean {
  if (landmarks.length < 9) return false;
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const distance = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
  return distance < 0.05; // Screen coordinate threshold
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
