import { useRef, useEffect, useState, useCallback } from 'react';
import { HandGestureController } from '@/lib/hand-gesture-control';
import { isPinching, isSpiderman, isOpenPalm, isGrab, Landmark, WorldLandmark } from '@/lib/gesture-recognition';
import { toast } from 'sonner';
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { transferApi } from '@/lib/api';

interface Unified3DSceneProps {
  models: Array<{
    id: string;
    modelUrl: string;
    name: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: number;
    locked?: boolean;
  }>;
  selectedModelId?: string | null;
  transformMode?: 'translate' | 'rotate' | 'scale';
  onModelClick?: (modelId: string) => void;
  onModelDrag?: (modelId: string, position: { x: number; y: number; z: number }) => void;
  onModelRotate?: (modelId: string, rotation: { x: number; y: number; z: number }) => void;
  onModelScale?: (modelId: string, scale: number) => void;
  webcamEnabled?: boolean;
  onTransferStateChange?: (state: 'idle' | 'sending' | 'receiving') => void;
  transferMode?: 'send' | 'receive';
}

export function Unified3DScene({
  models,
  selectedModelId,
  transformMode = 'translate',
  onModelClick,
  onModelDrag,
  onModelRotate,
  onModelScale,
  webcamEnabled = false,
  onTransferStateChange,
  transferMode = 'send',
}: Unified3DSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  const transformControlsRef = useRef<any>(null);
  const modelsRef = useRef<Map<string, any>>(new Map());
  const loaderRef = useRef<any>(null);
  const raycasterRef = useRef<any>(null);
  const mouseRef = useRef<any>(null);
  const isDraggingGizmoRef = useRef(false);
  const [threeLoaded, setThreeLoaded] = useState(false);
  const gestureControllerRef = useRef<HandGestureController | null>(null);
  const handsRef = useRef<any>(null);
  const cameraRefForGesture = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const targetPositionRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const targetRotationRef = useRef<{ x: number; y: number } | null>(null);
  const targetScaleRef = useRef<number | null>(null);
  
  // 그랩 제스처 감지 및 전송/수신 상태 관리
  const grabTimerRef = useRef<NodeJS.Timeout | null>(null);
  const grabStartTimeRef = useRef<number | null>(null);
  const wasOpenPalmRef = useRef<boolean>(false);
  const transferStateRef = useRef<'idle' | 'sending' | 'receiving'>('idle');
  const lastCheckedFileIdRef = useRef<string | null>(null);
  const lastLogTimeRef = useRef<{ [key: string]: number }>({});
  const lastToastTimeRef = useRef<{ [key: string]: number }>({});
  // transferMode를 ref에 저장하여 항상 최신 값 참조
  const transferModeRef = useRef<'send' | 'receive'>(transferMode);

  // 콜백을 ref에 저장하여 항상 최신 값 참조
  const callbacksRef = useRef({
    onModelClick,
    onModelDrag,
    onModelRotate,
    onModelScale,
  });

  // 콜백 및 transferMode 업데이트
  useEffect(() => {
    callbacksRef.current = {
      onModelClick,
      onModelDrag,
      onModelRotate,
      onModelScale,
    };
    transferModeRef.current = transferMode;
  }, [onModelClick, onModelDrag, onModelRotate, onModelScale, transferMode]);

  // Load Three.js and all required controls from CDN
  useEffect(() => {
    if ((window as any).THREE && (window as any).THREE.TransformControls) {
      setThreeLoaded(true);
      return;
    }

    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = reject;
        document.head.appendChild(script);
      });
    };

    const loadAllScripts = async () => {
      try {
        if (!(window as any).THREE) {
          await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js');
        }
        if (!(window as any).THREE.OrbitControls) {
          await loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js');
        }
        if (!(window as any).THREE.TransformControls) {
          await loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/TransformControls.js');
        }
        if (!(window as any).THREE.GLTFLoader) {
          await loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js');
        }
        setThreeLoaded(true);
      } catch (error) {
        console.error('Failed to load Three.js scripts:', error);
      }
    };

    loadAllScripts();
  }, []);

  // 씬 초기화
  useEffect(() => {
    if (!containerRef.current || !threeLoaded || !(window as any).THREE) return;

    const THREE = (window as any).THREE;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      50,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(3, 3, 6);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    // Shadow map 설정
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = true;
    renderer.shadowMap.needsUpdate = true;
    // Three.js r128에서는 outputEncoding 대신 colorSpace 사용
    if (renderer.outputEncoding !== undefined) {
    renderer.outputEncoding = THREE.sRGBEncoding;
    }
    if (renderer.toneMapping !== undefined) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    }
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // OrbitControls
    const orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.05;
    orbitControls.enableZoom = true;
    orbitControls.enablePan = true;
    orbitControls.minDistance = 1;
    orbitControls.maxDistance = 50;
    orbitControls.target.set(0, 0, 0);
    controlsRef.current = orbitControls;

    // TransformControls (기즈모)
    const transformControls = new THREE.TransformControls(camera, renderer.domElement);
    transformControls.setMode('translate');
    transformControls.setSize(1.2);
    transformControls.setSpace('world'); // 월드 좌표계 사용
    // Scale 모드에서 uniform 스케일 강제
    transformControls.showX = true;
    transformControls.showY = true;
    transformControls.showZ = true;
    scene.add(transformControls);
    transformControlsRef.current = transformControls;

    // TransformControls 이벤트 - 드래그 시작/종료
    transformControls.addEventListener('dragging-changed', (event: any) => {
      orbitControls.enabled = !event.value;
      isDraggingGizmoRef.current = event.value;
    });

    // TransformControls 이벤트 - 객체 변환 중
    transformControls.addEventListener('change', () => {
      const object = transformControls.object;
      if (!object || !object.userData.modelId || !isDraggingGizmoRef.current) return;

      const modelId = object.userData.modelId;
      const mode = transformControls.getMode();

      if (mode === 'translate' && callbacksRef.current.onModelDrag) {
        callbacksRef.current.onModelDrag(modelId, {
          x: object.position.x,
          y: object.position.y,
          z: object.position.z,
        });
      } else if (mode === 'rotate' && callbacksRef.current.onModelRotate) {
        callbacksRef.current.onModelRotate(modelId, {
          x: object.rotation.x,
          y: object.rotation.y,
          z: object.rotation.z,
        });
      } else if (mode === 'scale' && callbacksRef.current.onModelScale) {
        // Uniform scale: x, y, z 중 평균값 사용하여 모든 축을 동일하게 유지
        const avgScale = (object.scale.x + object.scale.y + object.scale.z) / 3;
        object.scale.set(avgScale, avgScale, avgScale);
        callbacksRef.current.onModelScale(modelId, avgScale);
      }
    });

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight1.position.set(5, 10, 5);
    directionalLight1.castShadow = true;
    // 그림자 맵 해상도 증가
    directionalLight1.shadow.mapSize.width = 4096;
    directionalLight1.shadow.mapSize.height = 4096;
    directionalLight1.shadow.camera.near = 0.1;
    directionalLight1.shadow.camera.far = 100;
    directionalLight1.shadow.camera.left = -30;
    directionalLight1.shadow.camera.right = 30;
    directionalLight1.shadow.camera.top = 30;
    directionalLight1.shadow.camera.bottom = -30;
    // 그림자 품질 개선
    directionalLight1.shadow.bias = -0.0001;
    directionalLight1.shadow.normalBias = 0.02;
    directionalLight1.shadow.radius = 4;
    // 그림자 업데이트 강제
    directionalLight1.shadow.needsUpdate = true;
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight2.position.set(-5, 5, -5);
    scene.add(directionalLight2);

    // === 작업대 (Workbench/Ground Plane) ===
    // 그리드 헬퍼 - 매우 촘촘하고 선명하게 설정 (80x80 그리드)
    const gridHelper = new THREE.GridHelper(20, 80, 0x666666, 0x999999);
    gridHelper.position.y = 0;
    gridHelper.material.opacity = 1.0; // 완전 불투명으로 선명하게
    gridHelper.material.transparent = false; // 불투명으로 설정
    scene.add(gridHelper);

    // 평면 지면
    const groundGeometry = new THREE.PlaneGeometry(20, 20);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5f5f5,
      roughness: 0.9,
      metalness: 0.0,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    ground.castShadow = false; // 지면은 그림자를 만들지 않음
    ground.name = 'ground';
    scene.add(ground);
    
    // 그림자 카메라 위치 업데이트
    directionalLight1.shadow.camera.updateProjectionMatrix();

    // 축 표시 (원점에)
    const axesHelper = new THREE.AxesHelper(2);
    axesHelper.position.set(-9, 0.01, -9);
    scene.add(axesHelper);

    // GLTF Loader
    const GLTFLoader = THREE.GLTFLoader || (window as any).THREE.GLTFLoader;
    const loader = new GLTFLoader();
    loaderRef.current = loader;

    // Raycaster
    const raycaster = new THREE.Raycaster();
    raycasterRef.current = raycaster;
    mouseRef.current = new THREE.Vector2();

    // Store camera reference for gesture control
    cameraRefForGesture.current = camera;

    // Animation loop with gesture control smoothing
    const clock = new THREE.Clock();
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const damping = 5.0 * delta;

      orbitControls.update();
      
      // 그림자 맵 지속 업데이트
      if (renderer.shadowMap.enabled) {
        // 모델이 있을 때만 그림자 업데이트
        if (modelsRef.current.size > 0) {
          renderer.shadowMap.needsUpdate = true;
          directionalLight1.shadow.needsUpdate = true;
        }
      }

      // Apply gesture-controlled transforms with smoothing
      if (targetPositionRef.current && selectedModelId) {
        const modelGroup = modelsRef.current.get(selectedModelId);
        if (modelGroup) {
          const currentPos = modelGroup.position;
          const targetPos = targetPositionRef.current;
          
          // 핀치 드래그 중일 때는 즉시 위치 업데이트, 아닐 때만 부드럽게 보간
          const isDragging = gestureControllerRef.current?.isDraggingActive() ?? false;
          
          if (isDragging) {
            // 드래그 중: 즉시 위치 업데이트 (지연 없음)
            currentPos.set(targetPos.x, targetPos.y, targetPos.z);
          } else {
            // 드래그 종료 후: 부드럽게 보간
            currentPos.lerp(
              new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z),
              damping
            );
          }
          
          if (callbacksRef.current.onModelDrag) {
            callbacksRef.current.onModelDrag(selectedModelId, {
              x: currentPos.x,
              y: currentPos.y,
              z: currentPos.z,
            });
          }
        }
      }

      if (targetRotationRef.current && selectedModelId) {
        const modelGroup = modelsRef.current.get(selectedModelId);
        if (modelGroup) {
          const targetEuler = new THREE.Euler(
            targetRotationRef.current.x,
            targetRotationRef.current.y,
            0,
            'XYZ'
          );
          const targetQuaternion = new THREE.Quaternion().setFromEuler(targetEuler);
          modelGroup.quaternion.slerp(targetQuaternion, damping);
          if (callbacksRef.current.onModelRotate) {
            callbacksRef.current.onModelRotate(selectedModelId, {
              x: modelGroup.rotation.x,
              y: modelGroup.rotation.y,
              z: modelGroup.rotation.z,
            });
          }
        }
      }

      // targetScaleRef.current가 null이 아닐 때만 스케일링 적용 (더블 핀치일 때만)
      // null이면 현재 스케일 유지 (싱글 핀치일 때 스케일 변경 방지)
      if (targetScaleRef.current !== null && selectedModelId) {
        const modelGroup = modelsRef.current.get(selectedModelId);
        if (modelGroup) {
          const currentScale = modelGroup.scale.x;
          const smoothScale = THREE.MathUtils.lerp(
            currentScale,
            targetScaleRef.current,
            damping
          );
          modelGroup.scale.set(smoothScale, smoothScale, smoothScale);
          if (callbacksRef.current.onModelScale) {
            callbacksRef.current.onModelScale(selectedModelId, smoothScale);
          }
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Mouse click handler for model selection
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current || !raycasterRef.current || !cameraRef.current) return;

      // 기즈모 드래그 중이면 무시
      if (isDraggingGizmoRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

      // Get all model meshes (exclude ground and transform controls)
      const meshes: any[] = [];
      modelsRef.current.forEach((group) => {
        group.traverse((child: any) => {
          if (child.isMesh && child.name !== 'ground') {
            meshes.push(child);
          }
        });
      });

      const intersects = raycasterRef.current.intersectObjects(meshes, true);

      if (intersects.length > 0) {
        const clickedMesh = intersects[0].object;

        for (const [modelId, group] of modelsRef.current.entries()) {
          let found = false;
          group.traverse((child: any) => {
            if (child === clickedMesh) {
              found = true;
            }
          });

          if (found) {
            if (callbacksRef.current.onModelClick) {
              callbacksRef.current.onModelClick(modelId);
            }
            break;
          }
        }
      }
    };

    containerRef.current.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current) {
        containerRef.current.removeEventListener('click', handleClick);
        if (renderer.domElement && containerRef.current.contains(renderer.domElement)) {
          containerRef.current.removeChild(renderer.domElement);
        }
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      transformControls.dispose();
      renderer.dispose();
    };
  }, [threeLoaded]);

  // Load models
  useEffect(() => {
    if (!sceneRef.current || !loaderRef.current || !threeLoaded || !(window as any).THREE) return;

    const THREE = (window as any).THREE;

    models.forEach((model) => {
      if (modelsRef.current.has(model.id)) return;

      loaderRef.current.load(
        model.modelUrl,
        (gltf: any) => {
          if (!sceneRef.current) return;

          const modelGroup = new THREE.Group();
          modelGroup.add(gltf.scene.clone());
          modelGroup.userData.modelId = model.id;

          modelGroup.position.set(
            model.position.x,
            model.position.y,
            model.position.z
          );

          modelGroup.rotation.set(
            model.rotation.x,
            model.rotation.y,
            model.rotation.z
          );

          const scale = model.scale || 1;
          modelGroup.scale.set(scale, scale, scale);

          modelGroup.traverse((child: any) => {
            if (child.isMesh) {
              // 그림자 설정 강제 적용
              child.castShadow = true;
              child.receiveShadow = true;
              
              // 그림자가 제대로 표시되도록 추가 설정
              if (child.geometry) {
                child.geometry.computeBoundingBox();
                child.geometry.computeBoundingSphere();
              }
              
              if (child.material) {
                if (Array.isArray(child.material)) {
                  child.material.forEach((mat: any) => {
                    if (mat.map) mat.map.anisotropy = 16;
                    mat.needsUpdate = true;
                    // 그림자 관련 속성 확인
                    if (mat.shadowSide !== undefined) {
                      mat.shadowSide = THREE.FrontSide;
                    }
                  });
                } else {
                  if (child.material.map) child.material.map.anisotropy = 16;
                  child.material.needsUpdate = true;
                  // 그림자 관련 속성 확인
                  if (child.material.shadowSide !== undefined) {
                    child.material.shadowSide = THREE.FrontSide;
                  }
                }
              }
            }
          });
          
          // 모델 그룹 자체도 그림자 설정
          modelGroup.castShadow = true;
          modelGroup.receiveShadow = true;

          sceneRef.current.add(modelGroup);
          modelsRef.current.set(model.id, modelGroup);

          // 첫 번째 모델이 로드될 때 카메라를 모델에 맞게 조정 (더 줌인)
          if (modelsRef.current.size === 1 && cameraRef.current && controlsRef.current) {
            const box = new THREE.Box3().setFromObject(modelGroup);
            if (!box.isEmpty()) {
              const center = box.getCenter(new THREE.Vector3());
              const size = box.getSize(new THREE.Vector3());
              const maxDim = Math.max(size.x, size.y, size.z);
              
              if (maxDim > 0) {
                // 모델 크기에 맞춰 카메라 거리 계산 (더 가깝게 줌인)
                const distance = maxDim * 1.5;
                const cameraPos = new THREE.Vector3(
                  center.x + distance * 0.6,
                  center.y + distance * 0.6,
                  center.z + distance * 0.8
                );
                
                // 부드럽게 카메라 이동
                const currentPos = cameraRef.current.position.clone();
                const targetPos = cameraPos;
                const duration = 1000; // 1초
                const startTime = Date.now();
                
                const animateCamera = () => {
                  const elapsed = Date.now() - startTime;
                  const progress = Math.min(elapsed / duration, 1);
                  const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
                  
                  cameraRef.current.position.lerpVectors(currentPos, targetPos, eased);
                  cameraRef.current.lookAt(center);
                  controlsRef.current.target.copy(center);
                  controlsRef.current.update();
                  
                  if (progress < 1) {
                    requestAnimationFrame(animateCamera);
                  }
                };
                
                animateCamera();
              }
            }
          }

          // 방금 추가된 모델이 선택된 모델이면 TransformControls 연결
          if (model.id === selectedModelId && transformControlsRef.current) {
            transformControlsRef.current.attach(modelGroup);
          }
        },
        undefined,
        (error: Error) => {
          console.error('Error loading model:', error);
        }
      );
    });

    // Remove models that are no longer in the list
    modelsRef.current.forEach((group, modelId) => {
      if (!models.find(m => m.id === modelId)) {
        if (sceneRef.current) {
          sceneRef.current.remove(group);
        }
        if (transformControlsRef.current && transformControlsRef.current.object === group) {
          transformControlsRef.current.detach();
        }
        group.traverse((child: any) => {
          if (child.isMesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach((mat: any) => mat.dispose());
              } else {
                child.material.dispose();
              }
            }
          }
        });
        modelsRef.current.delete(modelId);
      }
    });
  }, [models, threeLoaded, selectedModelId]);

  // Update model transforms from props (슬라이더에서 변경 시)
  useEffect(() => {
    if (!threeLoaded || isDraggingGizmoRef.current) return;

    models.forEach((model) => {
      const modelGroup = modelsRef.current.get(model.id);
      if (modelGroup) {
        modelGroup.position.set(
          model.position.x,
          model.position.y,
          model.position.z
        );
        modelGroup.rotation.set(
          model.rotation.x,
          model.rotation.y,
          model.rotation.z
        );
        modelGroup.scale.set(model.scale, model.scale, model.scale);
      }
    });
  }, [models, threeLoaded]);

  // Handle selected model change - attach/detach TransformControls
  useEffect(() => {
    if (!threeLoaded || !transformControlsRef.current) return;

    if (selectedModelId) {
      const modelGroup = modelsRef.current.get(selectedModelId);
      if (modelGroup) {
        const modelData = models.find(m => m.id === selectedModelId);
        if (modelData?.locked) {
          transformControlsRef.current.detach();
        } else {
          transformControlsRef.current.attach(modelGroup);
        }
      } else {
        transformControlsRef.current.detach();
      }
    } else {
      transformControlsRef.current.detach();
    }
  }, [selectedModelId, threeLoaded, models]);

  // Handle transform mode change
  useEffect(() => {
    if (!threeLoaded || !transformControlsRef.current) return;
    transformControlsRef.current.setMode(transformMode);
  }, [transformMode, threeLoaded]);

  // Initialize MediaPipe Hands and gesture control
  useEffect(() => {
    if (!webcamEnabled || !threeLoaded || !cameraRefForGesture.current) {
      // Cleanup when disabled
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track: MediaStreamTrack) => track.stop());
      }
      if (handsRef.current) {
        handsRef.current.close();
        handsRef.current = null;
      }
      targetPositionRef.current = null;
      targetRotationRef.current = null;
      targetScaleRef.current = null;
      return;
    }

    let cleanup: (() => void) | null = null;

    const loadMediaPipe = async () => {
      try {
        console.log('[Hand Gesture] Starting MediaPipe initialization...');
        
        // MediaPipe Hands는 이미 import로 로드되었습니다
        console.log('[Hand Gesture] MediaPipe Hands available via npm');

        // Initialize Hands
        const hands = new Hands({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
          }
        });

        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.7
        });

        console.log('[Hand Gesture] Hands initialized');

        // Initialize gesture controller
        if (!cameraRefForGesture.current) {
          throw new Error('Camera not initialized');
        }
        const gestureController = new HandGestureController(cameraRefForGesture.current);
        gestureControllerRef.current = gestureController;
        console.log('[Hand Gesture] Gesture controller initialized');

        // Get webcam stream
        console.log('[Hand Gesture] Requesting webcam access...');
        const video = document.createElement('video');
        video.style.display = 'none';
        video.setAttribute('playsinline', '');
        video.setAttribute('autoplay', '');
        video.setAttribute('muted', '');
        document.body.appendChild(video);
        videoRef.current = video;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: 640, 
            height: 480,
            facingMode: 'user'
          }
        });
        console.log('[Hand Gesture] Webcam access granted');
        video.srcObject = stream;
        await video.play();
        console.log('[Hand Gesture] Video playing');

        // Process hand tracking results
        hands.onResults((results: any) => {
          if (!gestureControllerRef.current) {
            console.warn('[Hand Gesture] Gesture controller not available');
            return;
          }

          const { multiHandLandmarks, multiHandWorldLandmarks } = results;
          if (!multiHandLandmarks || multiHandLandmarks.length === 0) {
            targetPositionRef.current = null;
            targetRotationRef.current = null;
            targetScaleRef.current = null;
            // 손이 감지되지 않으면 그랩 상태도 리셋
            wasOpenPalmRef.current = false;
            grabStartTimeRef.current = null;
            return;
          }

          // 그랩 제스처는 selectedModelId 없이도 작동해야 함
          // 먼저 그랩/손바닥 감지
          const convertLandmarks = (landmarks: any[]): Landmark[] => {
            return landmarks.map((lm: any) => ({
              x: lm.x,
              y: lm.y,
              z: lm.z || 0,
            }));
          };

          let grabHand: Landmark[] | null = null;
          let openPalmHand: Landmark[] | null = null;

          multiHandLandmarks.forEach((landmarks: any[]) => {
            const converted = convertLandmarks(landmarks);
            const isGrabDetected = isGrab(converted);
            const isOpenPalmDetected = isOpenPalm(converted);
            
            if (isGrabDetected) {
              grabHand = converted;
            }
            if (isOpenPalmDetected) {
              openPalmHand = converted;
            }
          });

          // 그랩 제스처 처리 (selectedModelId와 무관하게)
          handleGrabGesture(grabHand, openPalmHand);

          // selectedModelId가 없으면 다른 제스처는 처리하지 않음
          if (!selectedModelId) {
            return;
          }

          const convertWorldLandmarks = (landmarks: any[]): WorldLandmark[] => {
            return landmarks.map((lm: any) => ({
              x: lm.x,
              y: lm.y,
              z: lm.z || 0,
            }));
          };

          // Priority: Double Pinch (scaling) > Single Pinch (movement) > Spider-Man (rotation)
          // 핀치가 감지되면 로테이트는 무시 (그랩은 이미 처리됨)
          const pinchingHands: Landmark[][] = [];
          const worldPinchingHands: WorldLandmark[][] = [];
          let rotationHand: Landmark[] | null = null;

          multiHandLandmarks.forEach((landmarks: any[], index: number) => {
            const converted = convertLandmarks(landmarks);
            if (isPinching(converted)) {
              pinchingHands.push(converted);
              if (multiHandWorldLandmarks && multiHandWorldLandmarks[index]) {
                worldPinchingHands.push(convertWorldLandmarks(multiHandWorldLandmarks[index]));
              }
            } else if (isSpiderman(converted) && pinchingHands.length === 0) {
              // 핀치가 없을 때만 로테이트 감지
              rotationHand = converted;
            }
          });

          // Handle gestures based on priority (한 번에 하나의 제스처만)
          if (pinchingHands.length === 2 && worldPinchingHands.length === 2) {
            // Double Pinch - Scaling (최우선)
            // 현재 선택된 모델의 스케일 가져오기
            let currentObjectScale: number | undefined;
            if (selectedModelId) {
              const modelGroup = modelsRef.current.get(selectedModelId);
              if (modelGroup) {
                currentObjectScale = modelGroup.scale.x;
              }
            }
            const scale = gestureControllerRef.current.handleScaling(
              pinchingHands[0],
              pinchingHands[1],
              currentObjectScale
            );
            if (scale !== null) {
              targetScaleRef.current = scale;
              targetPositionRef.current = null;
              targetRotationRef.current = null;
            }
          } else if (pinchingHands.length === 1 && worldPinchingHands.length === 1) {
            // Single Pinch - Movement
            // 싱글 핀치일 때는 스케일을 명확히 null로 설정 (의도치 않은 스케일링 방지)
            targetScaleRef.current = null;
            // 현재 선택된 모델의 위치 가져오기
            let currentObjectPosition: { x: number; y: number; z: number } | undefined;
            if (selectedModelId) {
              const modelGroup = modelsRef.current.get(selectedModelId);
              if (modelGroup) {
                currentObjectPosition = {
                  x: modelGroup.position.x,
                  y: modelGroup.position.y,
                  z: modelGroup.position.z,
                };
              }
            }
            const position = gestureControllerRef.current.handleMovement(
              pinchingHands[0],
              worldPinchingHands[0],
              currentObjectPosition
            );
            if (position) {
              targetPositionRef.current = position;
              targetRotationRef.current = null;
            } else {
              // 핀치가 시작 중이지만 아직 드래그가 시작되지 않았을 때도 스케일은 null 유지
              targetPositionRef.current = null;
            }
          } else if (rotationHand && pinchingHands.length === 0) {
            // Spider-Man - Rotation (핀치가 없을 때만)
            const rotation = gestureControllerRef.current.handleRotation(rotationHand);
            if (rotation) {
              targetRotationRef.current = rotation;
              targetPositionRef.current = null;
              targetScaleRef.current = null;
            }
          } else {
            // No active gesture
            targetPositionRef.current = null;
            targetRotationRef.current = null;
            targetScaleRef.current = null;
          }
        });

        // 그랩 제스처 처리 함수
        const handleGrabGesture = (grabHand: Landmark[] | null, openPalmHand: Landmark[] | null) => {
          const now = Date.now();
          
          // 손바닥을 펴고 있는 상태 감지
          if (openPalmHand) {
            // 손바닥 감지 로그 제거 - 너무 자주 출력됨
            wasOpenPalmRef.current = true;
            // 그랩 타이머 리셋
            if (grabTimerRef.current) {
              clearTimeout(grabTimerRef.current);
              grabTimerRef.current = null;
            }
            grabStartTimeRef.current = null;
            if (transferStateRef.current !== 'idle' && transferStateRef.current !== 'sending' && transferStateRef.current !== 'receiving') {
              transferStateRef.current = 'idle';
              if (onTransferStateChange) {
                onTransferStateChange('idle');
              }
            }
            return;
          }

          // 전송/수신 중이면 그랩 제스처 무시
          if (transferStateRef.current === 'sending' || transferStateRef.current === 'receiving') {
            return;
          }

          // 그랩 제스처 감지 (손바닥을 펴고 있다가 그랩으로 전환)
          if (grabHand) {
            if (!wasOpenPalmRef.current) {
              // 손바닥을 펴지 않고 바로 그랩한 경우 - 손바닥 상태로 간주
              wasOpenPalmRef.current = true;
              // 로그 제거 - 너무 자주 출력됨
              return;
            }

            // 그랩 시작 시간 기록
            if (grabStartTimeRef.current === null) {
              grabStartTimeRef.current = now;
              const currentMode = transferModeRef.current;
              if (!lastLogTimeRef.current['grabStart'] || now - lastLogTimeRef.current['grabStart'] > 3000) {
                console.log(`[Transfer] 그랩 감지됨 - ${currentMode === 'send' ? '전송' : '수신'} 모드`);
                lastLogTimeRef.current['grabStart'] = now;
              }
              if (!lastToastTimeRef.current['grabStart'] || now - lastToastTimeRef.current['grabStart'] > 3000) {
                toast.info(`${currentMode === 'send' ? '전송' : '수신'} 준비 중... 2초간 유지하세요`);
                lastToastTimeRef.current['grabStart'] = now;
              }
            }

            // 2초 동안 그랩 상태 유지 확인
            const grabDuration = now - grabStartTimeRef.current;
            const remaining = Math.ceil((2000 - grabDuration) / 1000);
            
            if (grabDuration >= 2000) {
              // 2초 경과 - 전송/수신 상태로 전환
              if (transferStateRef.current === 'idle') {
                const currentMode = transferModeRef.current;
                if (!lastLogTimeRef.current['grabComplete'] || now - lastLogTimeRef.current['grabComplete'] > 5000) {
                  console.log(`[Transfer] 2초 경과 - ${currentMode === 'send' ? '전송' : '수신'} 시작`);
                  lastLogTimeRef.current['grabComplete'] = now;
                }
                if (currentMode === 'send') {
                  handleSendGLB();
                } else {
                  // handleReceiveGLB 내부에서 상태를 설정하므로 여기서는 호출만
                  handleReceiveGLB();
                }
                // 상태 리셋
                grabStartTimeRef.current = null;
                wasOpenPalmRef.current = false;
              }
            } else {
              // 2초 미만 - 진행 중 표시 (1초마다, 중복 방지)
              if (remaining === 1 && grabDuration > 1000) {
                const currentMode = transferModeRef.current;
                if (!lastToastTimeRef.current['grabProgress'] || now - lastToastTimeRef.current['grabProgress'] > 2000) {
                  toast.info(`${currentMode === 'send' ? '전송' : '수신'} 준비 중... (${remaining}초)`);
                  lastToastTimeRef.current['grabProgress'] = now;
                }
              }
            }
          } else {
            // 그랩이 아니거나 손바닥을 펴지 않은 상태
            if (grabStartTimeRef.current !== null) {
              // 로그 제거 - 너무 자주 출력됨
              // toast만 표시 (더 긴 간격)
              if (!lastToastTimeRef.current['grabCancel'] || now - lastToastTimeRef.current['grabCancel'] > 3000) {
                toast.warning('그랩이 해제되었습니다. 다시 시도하세요.');
                lastToastTimeRef.current['grabCancel'] = now;
              }
            }
            // 손바닥 상태는 유지 (손을 뗀 경우가 아니라면)
            grabStartTimeRef.current = null;
            if (grabTimerRef.current) {
              clearTimeout(grabTimerRef.current);
              grabTimerRef.current = null;
            }
          }
        };

        // GLB 파일 전송 함수
        const handleSendGLB = async () => {
          // 전송 모드가 아니면 호출하지 않음
          const currentMode = transferModeRef.current;
          if (currentMode !== 'send') {
            console.warn('[Transfer] 전송 모드가 아닌데 handleSendGLB가 호출됨, 현재 모드:', currentMode);
            return;
          }

          // 이미 전송 중이면 중복 호출 방지
          if (transferStateRef.current === 'sending') {
            console.log('[Transfer] 이미 전송 중입니다.');
            return;
          }

          try {
            transferStateRef.current = 'sending';
            if (onTransferStateChange) {
              onTransferStateChange('sending');
            }
            toast.info('GLB 파일 생성 중...');
            
            if (!sceneRef.current || !(window as any).THREE) {
              throw new Error('Three.js not loaded');
            }

            const THREE = (window as any).THREE;
            
            // GLTFExporter 로드
            const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
            const exporter = new GLTFExporter();

            // 현재 씬의 모든 모델을 포함하는 그룹 생성
            const exportGroup = new THREE.Group();
            modelsRef.current.forEach((modelGroup) => {
              const cloned = modelGroup.clone();
              
              // 텍스처 정리: 문제가 있는 텍스처 완전히 제거
              cloned.traverse((child: any) => {
                if (child.isMesh && child.material) {
                  const materials = Array.isArray(child.material) ? child.material : [child.material];
                  materials.forEach((mat: any) => {
                    if (!mat) return;
                    
                    // 모든 텍스처 속성 정리
                    const textureProps = [
                      'map', 'normalMap', 'roughnessMap', 'metalnessMap', 
                      'aoMap', 'emissiveMap', 'bumpMap', 'displacementMap',
                      'alphaMap', 'lightMap', 'envMap'
                    ];
                    
                    textureProps.forEach((prop) => {
                      try {
                        if (mat[prop]) {
                          const texture = mat[prop];
                          // 텍스처가 있으면 안전하게 제거 (GLTFExporter의 mimeType 오류 방지)
                          // image.mimeType 접근 오류를 방지하기 위해 모든 텍스처 제거
                          if (texture && texture.dispose) {
                            try {
                              texture.dispose();
                            } catch (e) {
                              // dispose 오류는 무시
                            }
                          }
                          mat[prop] = null;
                        }
                      } catch (e) {
                        // 텍스처 접근 중 오류 발생 시 제거
                        mat[prop] = null;
                      }
                    });
                    
                    // 텍스처 배열이 있는 경우도 처리
                    if (mat.maps && Array.isArray(mat.maps)) {
                      mat.maps.forEach((tex: any) => {
                        if (tex && tex.dispose) {
                          try {
                            tex.dispose();
                          } catch (e) {
                            // dispose 오류는 무시
                          }
                        }
                      });
                      mat.maps = [];
                    }
                  });
                }
              });
              
              exportGroup.add(cloned);
            });

            // GLB 파일로 내보내기 (텍스처 처리 오류 방지)
            const glbBlob = await new Promise<Blob>((resolve, reject) => {
              // 오류 처리 개선
              const timeout = setTimeout(() => {
                reject(new Error('GLB export timeout'));
              }, 30000); // 30초 타임아웃

              try {
                exporter.parse(
                  exportGroup,
                  (result: any) => {
                    clearTimeout(timeout);
                    if (result instanceof ArrayBuffer) {
                      const blob = new Blob([result], { type: 'model/gltf-binary' });
                      resolve(blob);
                    } else {
                      reject(new Error('Export failed: Invalid result'));
                    }
                  },
                  (error: any) => {
                    clearTimeout(timeout);
                    console.error('[Transfer] GLB export error:', error);
                    reject(error);
                  },
                  { 
                    binary: true,
                    includeCustomExtensions: false,
                    // 텍스처를 포함하지 않도록 설정 (오류 방지)
                    onlyVisible: true,
                    truncateDrawRange: true
                  }
                );
              } catch (error) {
                clearTimeout(timeout);
                reject(error);
              }
            });

            // Blob을 File로 변환
            const glbFile = new File([glbBlob], `scene_${Date.now()}.glb`, {
              type: 'model/gltf-binary',
            });

            // 서버로 업로드
            toast.info('서버로 업로드 중...');
            const result = await transferApi.uploadGLB(glbFile);
            
            console.log('[Transfer] 전송 완료, fileId:', result.fileId);
            toast.success(`전송 완료! 파일 ID: ${result.fileId.substring(0, 8)}...`);
            transferStateRef.current = 'idle';
            if (onTransferStateChange) {
              onTransferStateChange('idle');
            }
          } catch (error) {
            console.error('Send GLB error:', error);
            toast.error(`전송 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
            transferStateRef.current = 'idle';
            if (onTransferStateChange) {
              onTransferStateChange('idle');
            }
          }
        };

        // GLB 파일 수신 함수
        const handleReceiveGLB = async () => {
          // 수신 모드가 아니면 호출하지 않음
          const currentMode = transferModeRef.current;
          if (currentMode !== 'receive') {
            console.warn('[Transfer] 수신 모드가 아닌데 handleReceiveGLB가 호출됨, 현재 모드:', currentMode);
            return;
          }

          // 이미 수신 중이면 중복 호출 방지
          if (transferStateRef.current === 'receiving') {
            console.warn('[Transfer] 이미 수신 중입니다.');
            return;
          }

          try {
            // 수신 상태로 전환
            transferStateRef.current = 'receiving';
            if (onTransferStateChange) {
              onTransferStateChange('receiving');
            }

            console.log('[Transfer] 수신 시작 - 최신 파일 ID 확인 중...');
            // 최신 파일 ID 확인
            const latestFileId = await transferApi.getLatestFileId();
            
            if (!latestFileId) {
              console.log('[Transfer] 수신할 파일이 없습니다.');
              toast.info('수신할 파일이 없습니다.');
              transferStateRef.current = 'idle';
              if (onTransferStateChange) {
                onTransferStateChange('idle');
              }
              return;
            }

            // 이미 수신한 파일이면 스킵 (중복 수신 방지)
            if (latestFileId === lastCheckedFileIdRef.current) {
              console.log('[Transfer] 이미 수신한 파일입니다:', latestFileId);
              toast.info('이미 수신한 최신 파일입니다. 새 파일이 업로드될 때까지 기다려주세요.');
              transferStateRef.current = 'idle';
              if (onTransferStateChange) {
                onTransferStateChange('idle');
              }
              return;
            }

            console.log('[Transfer] 새 파일 발견, 다운로드 시작:', latestFileId);
            toast.info('GLB 파일 다운로드 중...');
            
            // 파일 다운로드
            const blob = await transferApi.downloadGLB(latestFileId);
            lastCheckedFileIdRef.current = latestFileId;
            console.log('[Transfer] 파일 다운로드 완료, 씬에 로드 중...');

            // Blob을 URL로 변환
            const url = URL.createObjectURL(blob);

            // GLB 파일 로드
            if (!loaderRef.current || !sceneRef.current) {
              throw new Error('Scene not initialized');
            }

            const THREE = (window as any).THREE;
            loaderRef.current.load(
              url,
              (gltf: any) => {
                // 기존 모델 제거 (선택사항 - 필요에 따라 수정)
                // modelsRef.current.forEach((group) => {
                //   sceneRef.current?.remove(group);
                // });
                // modelsRef.current.clear();

                // 새 모델 추가
                const modelGroup = new THREE.Group();
                modelGroup.add(gltf.scene.clone());
                modelGroup.userData.modelId = `received_${Date.now()}`;
                sceneRef.current.add(modelGroup);
                modelsRef.current.set(modelGroup.userData.modelId, modelGroup);

                console.log('[Transfer] 수신 완료! 모델이 씬에 추가되었습니다.');
                toast.success('수신 완료!');
                transferStateRef.current = 'idle';
                if (onTransferStateChange) {
                  onTransferStateChange('idle');
                }

                // URL 정리
                URL.revokeObjectURL(url);
              },
              undefined,
              (error: Error) => {
                console.error('Load GLB error:', error);
                toast.error(`파일 로드 실패: ${error.message}`);
                transferStateRef.current = 'idle';
                if (onTransferStateChange) {
                  onTransferStateChange('idle');
                }
                URL.revokeObjectURL(url);
              }
            );
          } catch (error) {
            console.error('Receive GLB error:', error);
            toast.error(`수신 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
            transferStateRef.current = 'idle';
            if (onTransferStateChange) {
              onTransferStateChange('idle');
            }
          }
        };

        // Start processing video
        console.log('[Hand Gesture] Starting camera processing...');
        let isCleanedUp = false;
        const camera = new Camera(video, {
          onFrame: async () => {
            // cleanup이 실행되었거나 hands가 닫혔으면 처리하지 않음
            if (isCleanedUp || !handsRef.current) {
              return;
            }
            try {
              await hands.send({ image: video });
            } catch (error) {
              // cleanup 후 에러는 무시
              if (isCleanedUp) {
                return;
              }
              console.error('[Hand Gesture] Error sending frame to Hands:', error);
            }
          },
          width: 640,
          height: 480
        });
        camera.start();
        console.log('[Hand Gesture] Camera started');

        handsRef.current = hands;
        console.log('[Hand Gesture] MediaPipe setup complete!');

        cleanup = () => {
          isCleanedUp = true;
          // 카메라를 먼저 중지하여 onFrame 콜백이 더 이상 호출되지 않도록 함
          camera.stop();
          if (video.srcObject) {
            const tracks = (video.srcObject as MediaStream).getTracks();
            tracks.forEach((track: MediaStreamTrack) => track.stop());
          }
          if (video.parentNode) {
            video.parentNode.removeChild(video);
          }
          gestureControllerRef.current?.reset();
          // hands를 닫기 전에 ref를 null로 설정
          handsRef.current = null;
          try {
            hands.close();
          } catch (error) {
            // 이미 닫혔을 수 있으므로 에러 무시
            console.warn('[Hand Gesture] Error closing hands (may already be closed):', error);
          }
        };
      } catch (error) {
        console.error('[Hand Gesture] Failed to initialize MediaPipe Hands:', error);
        toast.error('모션 제어 초기화 실패', {
          description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        });
      }
    };

    loadMediaPipe();

    return () => {
      if (cleanup) cleanup();
    };
  }, [webcamEnabled, threeLoaded, selectedModelId]);

  // Highlight selected model
  useEffect(() => {
    if (!threeLoaded || !(window as any).THREE) return;

    const THREE = (window as any).THREE;

    modelsRef.current.forEach((group, modelId) => {
      group.traverse((child: any) => {
        if (child.isMesh && child.material) {
          const isSelected = modelId === selectedModelId;
          if (Array.isArray(child.material)) {
            child.material.forEach((mat: any) => {
              if (mat.emissive !== undefined) {
                mat.emissive = new THREE.Color(isSelected ? 0x00d4ff : 0x000000);
                mat.emissiveIntensity = isSelected ? 0.3 : 0;
              }
            });
          } else {
            if (child.material.emissive !== undefined) {
              child.material.emissive = new THREE.Color(isSelected ? 0x00d4ff : 0x000000);
              child.material.emissiveIntensity = isSelected ? 0.3 : 0;
            }
          }
        }
      });
    });
  }, [selectedModelId, threeLoaded]);

  if (!threeLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <div className="text-gray-500 text-sm">3D 씬 로딩 중...</div>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className="w-full h-full" />;
}
