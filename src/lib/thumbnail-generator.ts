import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Generate a thumbnail image from a GLB file
 * @param glbFile - The GLB file to generate thumbnail from
 * @param size - Size of the thumbnail (width and height)
 * @param quality - JPEG quality (0-1)
 * @returns Promise that resolves to a File object containing the thumbnail
 */
export async function generateThumbnailFromGLB(
    glbFile: File,
    size: number = 512,
    quality: number = 0.85
): Promise<File> {
    return new Promise((resolve, reject) => {
        // Create offscreen canvas
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;

        // Create renderer
        const renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true,
        });
        renderer.setSize(size, size);
        renderer.setClearColor(0xf0f0f0, 1); // Light gray background

        // Create scene
        const scene = new THREE.Scene();

        // Create camera
        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);

        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight1.position.set(5, 5, 5);
        scene.add(directionalLight1);

        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
        directionalLight2.position.set(-5, 3, -5);
        scene.add(directionalLight2);

        // Load GLB file
        const loader = new GLTFLoader();
        const reader = new FileReader();

        reader.onload = (event) => {
            const arrayBuffer = event.target?.result as ArrayBuffer;
            if (!arrayBuffer) {
                reject(new Error('Failed to read file'));
                return;
            }

            loader.parse(
                arrayBuffer,
                '',
                (gltf) => {
                    try {
                        const model = gltf.scene;
                        scene.add(model);

                        // Calculate bounding box to fit model in view
                        const box = new THREE.Box3().setFromObject(model);
                        const center = box.getCenter(new THREE.Vector3());
                        const size = box.getSize(new THREE.Vector3());

                        // Calculate the max dimension
                        const maxDim = Math.max(size.x, size.y, size.z);
                        const fov = camera.fov * (Math.PI / 180);
                        let cameraZ = Math.abs(maxDim / Math.sin(fov / 2));

                        // Add some padding
                        cameraZ *= 1.5;

                        // Position camera
                        camera.position.set(
                            center.x + cameraZ * 0.5,
                            center.y + cameraZ * 0.5,
                            center.z + cameraZ
                        );
                        camera.lookAt(center);

                        // Render the scene
                        renderer.render(scene, camera);

                        // Convert canvas to blob
                        canvas.toBlob(
                            (blob) => {
                                if (!blob) {
                                    reject(new Error('Failed to generate thumbnail blob'));
                                    return;
                                }

                                // Create File from blob
                                const fileName = glbFile.name.replace(/\.(glb|gltf)$/i, '_thumbnail.jpg');
                                const thumbnailFile = new File([blob], fileName, {
                                    type: 'image/jpeg',
                                    lastModified: Date.now(),
                                });

                                // Cleanup
                                renderer.dispose();
                                scene.clear();

                                resolve(thumbnailFile);
                            },
                            'image/jpeg',
                            quality
                        );
                    } catch (error) {
                        reject(error);
                    }
                },
                (error) => {
                    reject(new Error(`Failed to load GLB: ${error.message}`));
                }
            );
        };

        reader.onerror = () => {
            reject(new Error('Failed to read GLB file'));
        };

        reader.readAsArrayBuffer(glbFile);
    });
}

/**
 * Generate thumbnails for multiple GLB files
 * @param glbFiles - Array of GLB files
 * @param onProgress - Optional progress callback
 * @returns Promise that resolves to an array of File objects
 */
export async function generateThumbnailsFromGLBs(
    glbFiles: File[],
    onProgress?: (current: number, total: number) => void
): Promise<File[]> {
    const thumbnails: File[] = [];

    for (let i = 0; i < glbFiles.length; i++) {
        const thumbnail = await generateThumbnailFromGLB(glbFiles[i]);
        thumbnails.push(thumbnail);

        if (onProgress) {
            onProgress(i + 1, glbFiles.length);
        }
    }

    return thumbnails;
}
