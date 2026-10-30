/* Placeholder scene: proves the player contract (init, frame, resize, theme). Replaced by scene-a/b/c. */
import * as THREE from 'three';

let renderer, scene, camera, mesh, mat;

export default {
  init(ctx) {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(ctx.dpr);
    renderer.setSize(ctx.w, ctx.h, false);
    ctx.host.appendChild(renderer.domElement);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(35, ctx.w / ctx.h, 0.1, 100);
    camera.position.set(0, 0, 6);
    mat = new THREE.MeshBasicMaterial({ color: ctx.colors.accent, wireframe: true });
    mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2, 1), mat);
    scene.add(mesh);
  },
  frame(s) {
    mesh.rotation.y = s.t * 0.4;
    mesh.position.x = (s.step - 5) * 0.4;
    renderer.render(scene, camera);
  },
  resize(w, h) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); },
  theme(c) { mat.color.set(c.accent); }
};
