/**
 * ModelCanvas — gömülebilir three.js 3D görüntüleyici çekirdeği.
 * Hem tam ekran ModelViewer'da hem de Stage içi 3D önizlemede kullanılır.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

export function ModelCanvas({ url, ext, autoRotate = true }: { url: string; ext?: string; autoRotate?: boolean }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const rotRef = useRef(autoRotate);
  rotRef.current = autoRotate;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const width = mount.clientWidth || 400, height = mount.clientHeight || 300;
    setLoading(true); setError(null);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0b12);
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 1000);
    camera.position.set(2.4, 1.8, 2.4);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xbcd0ff, 0x0a0a12, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 2.0); key.position.set(4, 6, 4); scene.add(key);
    const rim = new THREE.DirectionalLight(0x7c6af7, 1.4); rim.position.set(-5, 2, -4); scene.add(rim);
    const grid = new THREE.GridHelper(10, 20, 0x333344, 0x1a1a26);
    (grid.material as THREE.Material).opacity = 0.35; (grid.material as THREE.Material).transparent = true;
    scene.add(grid);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.08;

    const frame = (obj: THREE.Object3D) => {
      const box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      obj.scale.setScalar(1.8 / maxDim);
      box.setFromObject(obj); box.getCenter(center);
      obj.position.sub(center);
      grid.position.y = -0.9;
      scene.add(obj);
      controls.target.set(0, 0, 0);
      camera.position.set(2.2, 1.6, 2.6);
      controls.update();
      setLoading(false);
    };

    const e = (ext || url.split('.').pop() || '').toLowerCase();
    try {
      if (e === 'demo' || url === 'demo') {
        const geo = new THREE.TorusKnotGeometry(0.7, 0.24, 220, 32);
        const mat = new THREE.MeshStandardMaterial({ color: 0x7c6af7, roughness: 0.28, metalness: 0.65, emissive: 0x120a2e });
        frame(new THREE.Mesh(geo, mat));
      } else if (e === 'obj') {
        new OBJLoader().load(url, (obj) => frame(obj), undefined, () => setError('Model yüklenemedi'));
      } else {
        new GLTFLoader().load(url, (g) => frame(g.scene), undefined, () => setError('Model yüklenemedi (.glb/.gltf/.obj)'));
      }
    } catch { setError('Model yüklenemedi'); }

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (rotRef.current) scene.rotation.y += 0.005;
      controls.update();
      renderer.render(scene, camera);
    };
    loop();

    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);
    const ro = new ResizeObserver(onResize); ro.observe(mount);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, [url, ext]);

  return (
    <div className="zmc" ref={mountRef}>
      {loading && !error && <div className="zviewer-overlay"><Loader2 size={20} className="z-spin" /> Model yükleniyor…</div>}
      {error && <div className="zviewer-overlay" style={{ color: 'var(--z-danger)' }}>{error}</div>}
    </div>
  );
}
