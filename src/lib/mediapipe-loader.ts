// MediaPipe Hands loader utility
// MediaPipe Hands는 ES 모듈이므로 동적 import를 사용하거나
// 올바른 방식으로 로드해야 합니다.

export async function loadMediaPipeHands(): Promise<{ Hands: any; Camera: any }> {
  // Try dynamic import first (if installed via npm)
  try {
    const handsModule = await import('@mediapipe/hands');
    const cameraModule = await import('@mediapipe/camera_utils');
    return {
      Hands: handsModule.Hands,
      Camera: cameraModule.Camera,
    };
  } catch (importError) {
    console.log('[MediaPipe] npm modules not available, trying CDN...');
    
    // MediaPipe Hands는 ES 모듈이므로 직접 스크립트 태그로 로드하기 어렵습니다.
    // 대신 unpkg의 ES 모듈 버전을 사용하거나, 다른 방법을 사용해야 합니다.
    
    // Alternative: Use MediaPipe from Google's CDN
    return new Promise((resolve, reject) => {
      // MediaPipe Hands는 실제로는 npm 패키지로 설치해야 합니다.
      // 하지만 설치가 실패한 경우를 대비해, 간단한 폴백을 제공합니다.
      
      // Note: MediaPipe Hands는 ES 모듈이므로, 실제로는 빌드 시스템에서
      // 처리해야 합니다. 여기서는 에러를 반환합니다.
      reject(new Error(
        'MediaPipe Hands requires npm installation. ' +
        'Please run: npm install @mediapipe/hands @mediapipe/camera_utils'
      ));
    });
  }
}
