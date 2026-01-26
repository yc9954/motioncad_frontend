import { useRef, useEffect, useState, useCallback } from 'react';

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
}

export function Unified3DScene({
  models,
  selectedModelId,
  transformMode = 'translate',
  onModelClick,
  onModelDrag,
  onModelRotate,
  onModelScale,
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

  // 콜백을 ref에 저장하여 항상 최신 값 참조
  const callbacksRef = useRef({
    onModelClick,
    onModelDrag,
    onModelRotate,
    onModelScale,
  });

  // 콜백 업데이트
  useEffect(() => {
    callbacksRef.current = {
      onModelClick,
      onModelDrag,
      onModelRotate,
      onModelScale,
    };
  }, [onModelClick, onModelDrag, onModelRotate, onModelScale]);

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
    camera.position.set(5, 5, 10);
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
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // OrbitControls
    const orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.05;
    orbitControls.enableZoom = true;
    orbitControls.enablePan = true;
    orbitControls.minDistance = 2;
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
    directionalLight1.shadow.mapSize.width = 2048;
    directionalLight1.shadow.mapSize.height = 2048;
    directionalLight1.shadow.camera.near = 0.5;
    directionalLight1.shadow.camera.far = 50;
    directionalLight1.shadow.camera.left = -20;
    directionalLight1.shadow.camera.right = 20;
    directionalLight1.shadow.camera.top = 20;
    directionalLight1.shadow.camera.bottom = -20;
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight2.position.set(-5, 5, -5);
    scene.add(directionalLight2);

    // === 작업대 (Workbench/Ground Plane) ===
    const gridHelper = new THREE.GridHelper(20, 20, 0xcccccc, 0xe0e0e0);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    const groundGeometry = new THREE.PlaneGeometry(20, 20);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0xfafafa,
      roughness: 0.9,
      metalness: 0.0,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    ground.name = 'ground';
    scene.add(ground);

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

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      orbitControls.update();
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
              child.castShadow = true;
              child.receiveShadow = true;
              if (child.material) {
                if (Array.isArray(child.material)) {
                  child.material.forEach((mat: any) => {
                    if (mat.map) mat.map.anisotropy = 16;
                    mat.needsUpdate = true;
                  });
                } else {
                  if (child.material.map) child.material.map.anisotropy = 16;
                  child.material.needsUpdate = true;
                }
              }
            }
          });

          sceneRef.current.add(modelGroup);
          modelsRef.current.set(model.id, modelGroup);

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
