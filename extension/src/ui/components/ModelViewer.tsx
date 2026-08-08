/**
 * ModelViewer — sohbete eklenen 3D modelleri (glb/gltf/obj) tıklayınca
 * tam ekran döndürülebilir olarak gösteren three.js görüntüleyici.
 */
import React, { useEffect, useRef, useState } from 'react';
import { X, RotateCw, Loader2 } from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

export function ModelViewer({ url, ext, name, onClose }: { url: string; ext?: string; name: string; onClose: () => void }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const rotRef = useRef(true);
  rotRef.current = autoRotate;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const width = mount.clientWidth, height = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0b12);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 1000);
    camera.position.set(2.4, 1.8, 2.4);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    // Lighting — stüdyo tarzı
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
      const scale = 1.8 / maxDim;
      obj.scale.setScalar(scale);
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
        new GLTFLoader().load(url, (g) => frame(g.scene), undefined, () => setError('Model yüklenemedi (yalnızca .glb/.gltf/.obj gömülü desteklenir)'));
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
      camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, [url, ext]);

  return (
    <div className="zviewer" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="zviewer-scrim" onClick={onClose} />
      <div className="zviewer-stage">
        <div className="zviewer-head">
          <span className="zsm" style={{ fontWeight: 600 }}>{name}</span>
          <div className="flex items-center gap-1.5">
            <button className={`zicon-btn ${autoRotate ? 'active' : ''}`} title="Otomatik döndür" onClick={() => setAutoRotate((v) => !v)}><RotateCw size={15} strokeWidth={1.75} /></button>
            <button className="zicon-btn" title="Kapat" onClick={onClose}><X size={16} strokeWidth={1.75} /></button>
          </div>
        </div>
        <div className="zviewer-canvas" ref={mountRef}>
          {loading && !error && <div className="zviewer-overlay"><Loader2 size={22} className="z-spin" /> Model yükleniyor…</div>}
          {error && <div className="zviewer-overlay" style={{ color: 'var(--z-danger)' }}>{error}</div>}
        </div>
        <div className="zviewer-foot zxs zmuted">Sürükle: döndür · Kaydır: yakınlaştır · Sağ tık: kaydır</div>
      </div>
    </div>
  );
}
