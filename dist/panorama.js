import * as THREE from './assets/three.module.js';

const rooms = [
  {name:'Зочны өрөө', image:'assets/jade-living-panorama.png'},
  {name:'Унтлагын өрөө', image:'assets/jade-bedroom-panorama.png'},
];

export function openPanorama(dialog, viewport, roomControls) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({antialias:true});
  } catch {
    viewport.textContent = 'Энэ төхөөрөмж дээр 360° дүрслэл нээгдсэнгүй.';
    return;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, 1, .1, 100);
  camera.rotation.order = 'YXZ';
  const geometry = new THREE.SphereGeometry(30, 48, 32);
  const material = new THREE.MeshBasicMaterial({side:THREE.BackSide});
  scene.add(new THREE.Mesh(geometry, material));
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', '360° интерьер. Сум дарахад эргэн харна.');
  viewport.append(canvas);
  const notice = document.createElement('p');
  notice.setAttribute('role','status');
  viewport.append(notice);

  let pitch = 0, yaw = 0, drag = null, request = 0, closed = false;
  const draw = () => {
    camera.rotation.set(pitch, yaw, 0);
    renderer.render(scene, camera);
  };
  const resize = () => {
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    draw();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(viewport);

  function loadRoom(index) {
    const current = ++request;
    notice.textContent = 'Зураг ачаалж байна…';
    new THREE.TextureLoader().load(rooms[index].image, texture => {
      if (closed || current !== request) {
        texture.dispose();
        return;
      }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.repeat.x = -1;
      texture.offset.x = 1;
      material.map?.dispose();
      material.map = texture;
      material.needsUpdate = true;
      pitch = 0;
      yaw = -Math.PI / 2;
      notice.textContent = '';
      for (const [i,button] of [...roomControls.children].entries()) {
        button.setAttribute('aria-pressed', String(i === index));
      }
      draw();
    }, undefined, () => {
      if (!closed && current === request) notice.textContent = 'Зураг ачаалагдсангүй.';
    });
  }
  rooms.forEach((room,index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = room.name;
    button.addEventListener('click', () => loadRoom(index));
    roomControls.append(button);
  });
  canvas.addEventListener('pointerdown', event => {
    drag = {id:event.pointerId,x:event.clientX,y:event.clientY};
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (event.pointerId !== drag?.id) return;
    yaw += (event.clientX-drag.x)*.005;
    pitch = THREE.MathUtils.clamp(pitch+(event.clientY-drag.y)*.005,-1.4,1.4);
    drag.x = event.clientX;
    drag.y = event.clientY;
    draw();
  });
  canvas.addEventListener('lostpointercapture', () => {drag = null;});
  canvas.addEventListener('keydown', event => {
    const shifts = {ArrowLeft:[.15,0],ArrowRight:[-.15,0],ArrowUp:[0,.12],ArrowDown:[0,-.12]};
    const delta = shifts[event.key];
    if (!delta) return;
    event.preventDefault();
    yaw += delta[0];
    pitch = THREE.MathUtils.clamp(pitch+delta[1],-1.4,1.4);
    draw();
  });
  dialog.addEventListener('close', () => {
    closed = true;
    observer.disconnect();
    material.map?.dispose();
    material.dispose();
    geometry.dispose();
    renderer.dispose();
  }, {once:true});
  resize();
  loadRoom(0);
}

