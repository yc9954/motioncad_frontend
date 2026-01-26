import { useRef, useEffect, useState } from 'react';

interface Unified3DSceneProps {
  models: Array<{
    id: string;
    modelUrl: string;
    name: string;
    position: { x: number; y: number; z?: number };
    rotation?: { x: number; y: number; z: number };
    scale?: number;
  }>;
  selectedModelId?: string | null;
  onModelClick?: (modelId: string) => void;
  onModelDrag?: (modelId: string, position: { x: number; y: number; z: number }) => void;
}

export function Unified3DScene({
  models,
  selectedModelId,
  onModelClick,
  onModelDrag,
}: Unified3DSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  const modelsRef = useRef<Map<string, any>>(new Map());
  const loaderRef = useRef<any>(null);
  const raycasterRef = useRef<any>(null);
  const mouseRef = useRef<any>(null);
  const isDraggingRef = useRef(false);
  const dragModelIdRef = useRef<string | null>(null);
  const dragPlaneRef = useRef<any>(null);
  const [threeLoaded, setThreeLoaded] = useState(false);

  // Load Three.js and OrbitControls from CDN
  useEffect(() => {
    if ((window as any).THREE) {
      setThreeLoaded(true);
      return;
    }

    const threeScript = document.createElement('script');
    threeScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    threeScript.onload = () => {
      // Load OrbitControls
      const orbitControlsScript = document.createElement('script');
      orbitControlsScript.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
      orbitControlsScript.onload = () => {
        // Load GLTFLoader
        const gltfLoaderScript = document.createElement('script');
        gltfLoaderScript.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js';
        gltfLoaderScript.onload = () => {
          setThreeLoaded(true);
        };
        document.head.appendChild(gltfLoaderScript);
      };
      document.head.appendChild(orbitControlsScript);
    };
    document.head.appendChild(threeScript);
  }, []);

  useEffect(() => {
    if (!containerRef.current || !threeLoaded || !(window as any).THREE) return;

    const THREE = (window as any).THREE;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x16171f);
    sceneRef.current = scene;

    // Camera setup with better FOV
    const camera = new THREE.PerspectiveCamera(
      50, // Better FOV for viewing
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 3, 8);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer setup with better quality
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: false,
      powerPreference: "high-performance"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Better quality
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // OrbitControls for camera
    if (THREE.OrbitControls) {
      const controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.enableZoom = true;
      controls.enablePan = true;
      controls.minDistance = 2;
      controls.maxDistance = 50;
      controlsRef.current = controls;
    }

    // Lighting - improved
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight1.position.set(5, 10, 5);
    directionalLight1.castShadow = true;
    directionalLight1.shadow.mapSize.width = 2048;
    directionalLight1.shadow.mapSize.height = 2048;
    directionalLight1.shadow.camera.near = 0.5;
    directionalLight1.shadow.camera.far = 50;
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-5, 5, -5);
    scene.add(directionalLight2);

    // Ground plane for shadows
    const planeGeometry = new THREE.PlaneGeometry(50, 50);
    const planeMaterial = new THREE.ShadowMaterial({ opacity: 0.2 });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -0.5;
    plane.receiveShadow = true;
    scene.add(plane);

    // Drag plane (invisible plane for dragging)
    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    dragPlaneRef.current = dragPlane;

    // GLTF Loader
    const GLTFLoader = THREE.GLTFLoader || (window as any).THREE.GLTFLoader;
    const loader = new GLTFLoader();
    loaderRef.current = loader;

    // Raycaster for mouse interaction
    const raycaster = new THREE.Raycaster();
    raycasterRef.current = raycaster;
    mouseRef.current = new THREE.Vector2();

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      if (controlsRef.current) {
        controlsRef.current.update();
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

    // Mouse events for dragging
    const handleMouseMove = (event: MouseEvent) => {
      if (!containerRef.current || !raycaster || !camera || !scene) return;

      const rect = containerRef.current.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      if (isDraggingRef.current && dragModelIdRef.current && dragPlaneRef.current) {
        raycaster.setFromCamera(mouseRef.current, camera);
        const intersectPoint = new THREE.Vector3();
        raycaster.ray.intersectPlane(dragPlaneRef.current, intersectPoint);
        
        const modelGroup = modelsRef.current.get(dragModelIdRef.current);
        if (modelGroup) {
          modelGroup.position.copy(intersectPoint);
          
          if (onModelDrag) {
            onModelDrag(dragModelIdRef.current, {
              x: intersectPoint.x,
              y: intersectPoint.y,
              z: intersectPoint.z,
            });
          }
        }
      }
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (!containerRef.current || !raycaster || !camera || !scene) return;

      const rect = containerRef.current.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouseRef.current, camera);
      
      // Get all meshes from models
      const meshes: any[] = [];
      modelsRef.current.forEach((group) => {
        group.traverse((child: any) => {
          if (child.isMesh) {
            meshes.push(child);
          }
        });
      });

      const intersects = raycaster.intersectObjects(meshes, true);

      if (intersects.length > 0 && !isDraggingRef.current) {
        const intersect = intersects[0];
        const clickedMesh = intersect.object;
        
        // Find which model was clicked
        for (const [modelId, group] of modelsRef.current.entries()) {
          let found = false;
          group.traverse((child: any) => {
            if (child === clickedMesh) {
              found = true;
            }
          });
          
          if (found) {
            isDraggingRef.current = true;
            dragModelIdRef.current = modelId;
            
            // Set drag plane at model's Y position
            const modelY = group.position.y;
            dragPlaneRef.current.constant = modelY;
            
            if (onModelClick) {
              onModelClick(modelId);
            }
            break;
          }
        }
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      dragModelIdRef.current = null;
    };

    containerRef.current.addEventListener('mousemove', handleMouseMove);
    containerRef.current.addEventListener('mousedown', handleMouseDown);
    containerRef.current.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [threeLoaded, onModelClick, onModelDrag]);

  // Load models
  useEffect(() => {
    if (!sceneRef.current || !loaderRef.current || !models.length || !threeLoaded || !(window as any).THREE) return;

    const THREE = (window as any).THREE;

    models.forEach((model) => {
      if (modelsRef.current.has(model.id)) return; // Already loaded

      loaderRef.current.load(
        model.modelUrl,
        (gltf: any) => {
          if (!sceneRef.current) return;

          const modelGroup = new THREE.Group();
          modelGroup.add(gltf.scene.clone());
          modelGroup.position.set(
            model.position.x,
            model.position.y,
            model.position.z || 0
          );
          
          if (model.rotation) {
            modelGroup.rotation.set(
              model.rotation.x,
              model.rotation.y,
              model.rotation.z
            );
          }

          const scale = model.scale || 1;
          modelGroup.scale.set(scale, scale, scale);

          // Enable shadows and improve quality
          gltf.scene.traverse((child: any) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              
              // Improve material quality
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
        },
        (progress: any) => {
          // Loading progress
        },
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
            if (child.material?.map) child.material.map.dispose();
          }
        });
        modelsRef.current.delete(modelId);
      }
    });
  }, [models, threeLoaded]);

  // Update model positions
  useEffect(() => {
    if (!threeLoaded) return;
    
    models.forEach((model) => {
      const modelGroup = modelsRef.current.get(model.id);
      if (modelGroup) {
        modelGroup.position.set(
          model.position.x,
          model.position.y,
          model.position.z || 0
        );
        
        if (model.scale) {
          modelGroup.scale.set(model.scale, model.scale, model.scale);
        }
      }
    });
  }, [models, threeLoaded]);

  // Highlight selected model
  useEffect(() => {
    if (!threeLoaded || !(window as any).THREE) return;
    
    const THREE = (window as any).THREE;
    
    modelsRef.current.forEach((group, modelId) => {
      group.traverse((child: any) => {
        if (child.isMesh && child.material) {
          if (modelId === selectedModelId) {
            // Highlight selected
            if (Array.isArray(child.material)) {
              child.material.forEach((mat: any) => {
                if (mat.emissive !== undefined) {
                  mat.emissive = new THREE.Color(0x00d4ff);
                  mat.emissiveIntensity = 0.5;
                }
              });
            } else {
              if (child.material.emissive !== undefined) {
                child.material.emissive = new THREE.Color(0x00d4ff);
                child.material.emissiveIntensity = 0.5;
              }
            }
          } else {
            // Remove highlight
            if (Array.isArray(child.material)) {
              child.material.forEach((mat: any) => {
                if (mat.emissive !== undefined) {
                  mat.emissive = new THREE.Color(0x000000);
                  mat.emissiveIntensity = 0;
                }
              });
            } else {
              if (child.material.emissive !== undefined) {
                child.material.emissive = new THREE.Color(0x000000);
                child.material.emissiveIntensity = 0;
              }
            }
          }
        }
      });
    });
  }, [selectedModelId, threeLoaded]);

  if (!threeLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#16171f]">
        <div className="text-center">
          <div className="text-gray-500 text-sm">3D 씬 로딩 중...</div>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className="w-full h-full" />;
}
