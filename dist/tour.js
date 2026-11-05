import * as THREE from './assets/three.module.js';
import {layoutFor,moveWalker} from './apartment-layout.js';

let active=null;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
export function openTour(home,startRoom){
  if(active)active.close();
  const dialog=document.createElement('dialog');dialog.id='tourDialog';dialog.setAttribute('aria-label',`${home.id} байрны 3D дотор аялал`);
  dialog.innerHTML=`<div class="tour-viewport" id="tourViewport"></div><div class="tour-top"><div class="tour-home"><small>ОРОН · ИНТЕРАКТИВ ДОТОР АЯЛАЛ</small><h2>${home.id} <span>· ${home.rooms} өрөө</span></h2><p>${home.area} м² · ${home.floor}-р давхар · Тавилгатай жишээ загвар</p></div><div class="tour-actions"><button data-action="entry">Үүдэнд очих</button><button data-action="mode" aria-pressed="false">▧ Дээрээс харах</button><button data-action="gyro" aria-pressed="false">◉ Утсаар эргэн харах</button><button data-action="share" aria-label="Энэ байрны аяллын холбоос хуулах">↗ Холбоос</button><button data-action="fullscreen" aria-label="Бүтэн дэлгэц">⛶</button><button class="tour-close" data-action="close" aria-label="Аяллыг хаах">×</button></div></div><div class="tour-crosshair"></div><div class="tour-status" role="status"></div><div class="tour-bottom"><div class="tour-map"><div class="tour-map-title"><span>БАЙРНЫ ПЛАН</span><button data-action="map" aria-expanded="false">Томруулах ↗</button></div><div class="tour-map-svg"></div></div><div class="tour-guide"><strong id="tourRoomName">Зочны өрөө</strong><p class="tour-help">Хулганаа дарж чирээд эргэн харна · W A S D / сумнуудаар алхана</p><p class="tour-note">Жишээ дотор орчин · Бодит архитектурын план биш</p></div><div class="tour-dpad" aria-label="Алхах удирдлага"><button data-move="forward" aria-label="Урагш алхах">↑</button><button data-move="left" aria-label="Зүүн тийш алхах">←</button><button data-move="back" aria-label="Хойш алхах">↓</button><button data-move="right" aria-label="Баруун тийш алхах">→</button></div></div>`;
  document.body.append(dialog);document.body.style.overflow='hidden';dialog.showModal();
  const q=s=>dialog.querySelector(s),world=layoutFor(home),{w,d,split,rooms}=world;
  let renderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}catch(e){q('.tour-viewport').innerHTML='<div class="tour-error"><h2>3D орчин нээгдсэнгүй</h2><p>Браузерын WebGL дэмжлэг шаардлагатай. Chrome эсвэл Safari-ийн шинэ хувилбараар нээгээрэй.</p></div>';const dismiss=()=>{document.body.style.overflow='';dialog.close();dialog.remove();};q('[data-action="close"]').onclick=dismiss;dialog.addEventListener('cancel',e=>{e.preventDefault();dismiss();});return;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label','3D байр. Дарж чирэхэд эргэн харна. W A S D эсвэл сумнуудаар алхана.');q('.tour-viewport').append(canvas);
  const scene=new THREE.Scene();scene.background=new THREE.Color('#dce7e7');
  const camera=new THREE.PerspectiveCamera(68,1,.06,160);camera.rotation.order='YXZ';
  const doors=[],colliders=[],outerWalls=[],ceilings=[],disposables=new Set(),events=[];
  const on=(target,event,fn,options)=>{target.addEventListener(event,fn,options);events.push(()=>target.removeEventListener(event,fn,options));};
  const mat=(color,opts={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.78,...opts});disposables.add(m);return m;};
  const ivory=mat('#e4dcd0'),white=mat('#faf7ef'),wood=mat('#b28b61'),darkWood=mat('#392a23'),sage=mat('#294638'),fabric=mat('#c5bca7'),brass=mat('#b99a64',{metalness:.55,roughness:.32}),black=mat('#303731'),tile=mat('#d6d6ca'),glass=mat('#c6e0dd',{transparent:true,opacity:.17,roughness:.08,metalness:.1});
  function box(x,y,z,sx,sy,sz,m,solid=false){const geo=new THREE.BoxGeometry(sx,sy,sz);disposables.add(geo);const mesh=new THREE.Mesh(geo,m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);if(solid)colliders.push({minX:x-sx/2,maxX:x+sx/2,minZ:z-sz/2,maxZ:z+sz/2});return mesh;}
  function cylinder(x,y,z,r,h,m,r2=r){const g=new THREE.CylinderGeometry(r2,r,h,18);disposables.add(g);const a=new THREE.Mesh(g,m);a.position.set(x,y,z);a.castShadow=true;scene.add(a);return a;}
  // Procedural oak boards keep the apartment lightweight and work offline.
  const texCanvas=document.createElement('canvas');texCanvas.width=256;texCanvas.height=256;const ctx=texCanvas.getContext('2d');
  const plankColors=['#89684e','#806047','#917159','#755641'];for(let row=0;row<8;row++){ctx.fillStyle=plankColors[row%4];ctx.fillRect(0,row*32,256,32);ctx.fillStyle='#a58a6b';ctx.fillRect(0,row*32,256,1);const offset=(row%3)*71;ctx.fillRect(offset,row*32,1,32);for(let j=0;j<7;j++){ctx.fillStyle=j%2?'#ffffff0b':'#5940230b';ctx.fillRect(0,row*32+3+j*4,256,1);}}
  const tex=new THREE.CanvasTexture(texCanvas);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(w/2,d/2);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());disposables.add(tex);const floorMat=mat('#ffffff',{map:tex});
  box(w/2,-.1,d/2,w,.2,d,floorMat);
  box(w/2,-.24,d/2,w+.4,.1,d+.4,ivory);
  const ceiling=box(w/2,2.87,d/2,w,.12,d,white);ceilings.push(ceiling);
  const H=2.8,T=.14;
  function wall(x,z,sx,sz){return box(x,H/2,z,sx,H,sz,ivory,true);}
  // Perimeter walls contain real openings for the windows.
  outerWalls.push(wall(0,d/2,T,d),wall(w,d/2,T,d));
  function windowWall(z){const list=[];list.push(box(w/2,.43,z,w,.86,T,ivory),box(w/2,2.59,z,w,.42,T,ivory));
    const cuts=[0,w*.13,w*.48,w*.55,w*.86,w];for(let i=0;i<cuts.length;i+=2){const a=cuts[i],b=cuts[i+1];list.push(box((a+b)/2,1.7,z,b-a,1.8,T,ivory));}
    for(const [a,b] of [[w*.13,w*.48],[w*.55,w*.86]]){const mid=(a+b)/2;list.push(box(mid,1.65,z,b-a,1.55,.025,glass));for(const xx of [a,mid,b])list.push(box(xx,1.65,z,.045,1.66,.08,white));for(const yy of [.83,1.65,2.48])list.push(box(mid,yy,z,b-a+.07,.045,.09,white));list.push(box(mid,.82,z,b-a+.12,.06,.34,white));}
    colliders.push({minX:-.1,maxX:w+.1,minZ:z-.09,maxZ:z+.09});outerWalls.push(...list);
  }
  const entryX = split * .67;
  const walkingWorld = {...world, d: d + 1.55};
  const walnutDoor = mat('#41302a');
  const greenDoor = mat('#263d35');
  const blueDoor = mat('#34495c');
  const entryDoor = mat('#171f1a');
  const doorBounds = new THREE.Box3();

  function addDoor(x, z, width, closedAngle, swing, material, label, exterior = false) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0, z);
    pivot.rotation.y = closedAngle;
    scene.add(pivot);
    const leaf = box(width / 2, 1.10, 0, width, 2.18, .07, material);
    pivot.add(leaf);
    for (const side of [-1, 1]) {
      const handle = box(width - .15, 1.04, side * .065, .15, .045, .065, brass);
      pivot.add(handle);
      const detail = box(width / 2, 1.91, side * .038, width * .75, .014, .008, brass);
      pivot.add(detail);
    }
    const barrier = {};
    colliders.push(barrier);
    const door = {pivot, leaf, barrier, closedAngle, swing, label, open:false};
    pivot.userData.door = door;
    doors.push(door);
    if (exterior) outerWalls.push(pivot);
    updateDoorBounds(door);
  }

  function updateDoorBounds(door) {
    door.pivot.updateWorldMatrix(true, true);
    doorBounds.setFromObject(door.leaf);
    Object.assign(door.barrier, {minX:doorBounds.min.x,maxX:doorBounds.max.x,minZ:doorBounds.min.z,maxZ:doorBounds.max.z});
  }

  function partitionX(x, from, to, center, material, label, swing = Math.PI / 2) {
    const gap = 1.05;
    const a = center - gap / 2;
    const b = center + gap / 2;
    if (a > from) wall(x, (from + a) / 2, T, a - from);
    if (to > b) wall(x, (b + to) / 2, T, to - b);
    box(x, 2.5, center, .18, .6, gap, ivory);
    for (const z of [a, b]) box(x, 1.1, z, .2, 2.2, .05, darkWood);
    addDoor(x, a + .035, gap - .07, -Math.PI / 2, swing, material, label);
  }

  windowWall(0);
  const entryHalf = .55;
  const leftEdge = entryX - entryHalf;
  const rightEdge = entryX + entryHalf;
  outerWalls.push(wall(leftEdge / 2, d, leftEdge, T), wall((rightEdge + w) / 2, d, w - rightEdge, T));
  outerWalls.push(box(entryX, 2.5, d, 1.1, .6, .19, ivory));
  addDoor(leftEdge + .035, d, 1.03, 0, -Math.PI / 2, entryDoor, 'Байрны үүд', true);
  const hallTile = mat('#77736b');
  box(w / 2, -.07, d + .775, w, .14, 1.55, hallTile);
  outerWalls.push(wall(w / 2, d + 1.55, w, T), wall(0, d + .775, T, 1.55), wall(w, d + .775, T, 1.55));
  ceilings.push(box(w / 2, 2.87, d + .775, w, .12, 1.55, white));
  const hallLight = new THREE.PointLight('#ffd7a5', 9, 8, 2);
  hallLight.position.set(entryX, 2.45, d + .9);
  scene.add(hallLight);
  partitionX(2.2, 0, 2.2, 1.25, greenDoor, 'Ариун цэврийн өрөө', -Math.PI / 2);
  wall(1.1, 2.2, 2.2, T);
  if (home.rooms === 3) {
    partitionX(split, 0, d * .53, d * .27, walnutDoor, 'Унтлагын өрөө');
    partitionX(split, d * .53, d, d * .78, blueDoor, 'Хүүхдийн өрөө');
    wall((split + w) / 2, d * .53, w - split, T);
  } else if (home.rooms === 2) {
    partitionX(split, 0, d, d * .7, walnutDoor, 'Унтлагын өрөө');
  }
  // Skirting boards, recessed lighting, and a quiet framed art palette.
  box(.08,.07,d/2,.045,.14,d,white);box(w-.08,.07,d/2,.045,.14,d,white);
  function artwork(x,z,orientation,color){const m=mat(color);const frame=box(x,1.7,z,orientation==='x'?.045:1.2,.88,orientation==='x'?1.2:.045,wood);box(x+(orientation==='x'?.03:0),1.7,z+(orientation==='x'?0:.03),orientation==='x'?.02:1.08,.76,orientation==='x'?1.08:.02,m);return frame;}
  // Kitchen with cabinet fronts, worktop, sink, and a hob.
  for(let i=0;i<3;i++){const x=2.65+i*.73;box(x,.43,.42,.7,.86,.7,greenDoor,true);box(x,.89,.42,.73,.055,.74,white);box(x,1.95,.2,.7,.66,.32,ivory);box(x+.24,.55,.8,.02,.14,.025,brass);}
  box(3.38,.925,.42,.56,.035,.42,black);for(const x of [3.2,3.55])for(const z of [.3,.55])cylinder(x,.95,z,.09,.01,black);
  box(2.65,.93,.42,.44,.025,.3,mat('#8f9b98',{metalness:.6}));cylinder(2.65,1.07,.17,.02,.28,brass);box(2.65,1.2,.27,.04,.04,.21,brass);
  const fridgeX=Math.min(split-.5,4.9);box(fridgeX,1,.38,.68,2,.68,white,true);box(fridgeX+.24,1.35,.75,.025,.4,.025,brass);box(fridgeX,1.35,.73,.63,.015,.02,tile);
  // Living area, keeping a clear walking path to every door.
  const sofaX=1.0,sofaZ=d*.64;box(sofaX,.31,sofaZ,1.3,.48,2.3,sage,true);box(.4,.78,sofaZ,.26,.8,2.4,sage);for(const z of [sofaZ-1.05,sofaZ+1.05])box(sofaX,.65,z,1.45,.55,.2,sage);for(const z of [sofaZ-.6,sofaZ+.15])box(1.03,.64,z,.9,.16,.7,fabric);
  const rug=mat('#ddd2bc');box(2.6,.014,sofaZ,2.45,.025,2.8,rug);box(2.7,.4,sofaZ,.95,.11,1.2,wood,true);for(const x of [2.38,3.02])for(const z of [sofaZ-.4,sofaZ+.4])box(x,.2,z,.045,.4,.045,black);cylinder(2.7,.51,sofaZ,.15,.09,ivory);box(2.55,.49,sofaZ-.3,.25,.04,.34,mat('#6e806c'));
  if(home.rooms===1){bed(w-1.2,d*.61,1.7,2.1);}else {const tvX=split-.23;box(tvX,.35,d*.42,.36,.55,1.6,wood,true);box(tvX-.08,1.25,d*.42,.08,.78,1.3,black);box(tvX-.13,1.25,d*.42,.01,.69,1.2,mat('#354e50',{emissive:'#203c3b',emissiveIntensity:.18}));}
  function bed(x,z,bw,bd,child=false){box(x,.23,z,bw,.38,bd,wood,true);box(x,.49,z,bw-.05,.2,bd-.06,white);box(x,.62,z+.17,bw-.08,.12,bd*.62,mat(child?'#57788f':'#d9b79a'));box(x,.66,z-bd*.32,bw*.8,.17,.42,fabric);box(x,.7,z-bd/2-.04,bw+.08,1.1,.1,wood);for(const side of [-1,1]){box(x+side*(bw/2+.28),.34,z-bd*.3,.42,.6,.42,wood);cylinder(x+side*(bw/2+.28),.72,z-bd*.3,.12,.19,white);}}
  if(home.rooms>1){const bx=split+(w-split)*.67;if(home.rooms===3){bed(bx,d*.26,1.6,2);bed(bx,d*.77,1.2,1.95,true);box(w-.4,.75,d*.53+.5,.6,1.5,.45,wood,true);}else bed(bx,d*.43,1.8,2.15);box(w-.35,1.1,.85,.55,2.2,1.25,ivory,true);artwork(w-.1,d*.48,'x','#b8c6b6');}
  // Dining area and pendant light.
  const tableX=home.rooms===1?3.9:split*.68,tableZ=home.rooms===1?2.5:2.7;
  cylinder(tableX,.76,tableZ,.58,.09,wood);cylinder(tableX,.38,tableZ,.065,.72,black);colliders.push({minX:tableX-.58,maxX:tableX+.58,minZ:tableZ-.58,maxZ:tableZ+.58});
  for(const side of [-1,1]){box(tableX+side*.77,.45,tableZ,.4,.1,.45,sage);box(tableX+side*.94,.75,tableZ,.07,.6,.45,sage);for(const dz of [-.14,.14])box(tableX+side*.77,.22,tableZ+dz,.045,.45,.045,wood);}
  cylinder(tableX,2.69,tableZ,.012,.22,black);cylinder(tableX,2.44,tableZ,.27,.17,brass,.13);
  // Bathroom fixtures and tiled floor; doorway stays unobstructed.
  box(1.1,.018,1.1,2.05,.035,2.05,tile);box(.45,.9,.45,.7,.16,.5,white,true);box(.45,1.65,.08,.65,.75,.025,mat('#9db4b1',{metalness:.7,roughness:.08}));cylinder(.6,.25,1.65,.24,.45,white);box(.6,.45,1.93,.46,.75,.14,white);box(1.6,.04,.5,.85,.08,.85,white);box(1.6,1,.96,.85,1.9,.012,glass);
  const marble = mat('#d0cabe',{roughness:.32});
  const jade = mat('#1c3b32',{roughness:.36});
  box(1.1,1.4,.085,2.02,2.65,.027,jade);
  box(.46,.81,.44,.75,.46,.53,marble);
  box(.84,1.61,.11,.028,.72,.023,mat('#f3d49d',{emissive:'#ffc879',emissiveIntensity:1.2}));
  const bathroomLight = new THREE.PointLight('#e0f2e9',4.5,5,2);
  bathroomLight.position.set(1.1,2.38,1.1);
  scene.add(bathroomLight);
  const livingPanel = mat('#253e34',{roughness:.51});
  box(.09,1.45,sofaZ,.045,2.62,2.76,livingPanel);
  for(let i=0;i<9;i++) box(.123,1.48,sofaZ-1.28+i*.32,.035,2.57,.055,darkWood);
  if(home.rooms>1){
    const bedroomLight = new THREE.PointLight('#ffcfaa',5,6,2);
    bedroomLight.position.set(w-1.4,2.2,d*.31);
    scene.add(bedroomLight);
    if(home.rooms===3){
      const study = mat('#486576');
      box(w-.41,.73,d-.72,.65,.09,1.08,study,true);
      box(w-.66,.37,d-.72,.08,.73,1.05,study);
      box(w-.105,1.5,d-.72,.05,.85,1.05,study);
    }
  }
  // Indoor plants and artwork make the scale easier to judge.
  function plant(x,z){cylinder(x,.2,z,.22,.4,mat('#a58d72'),.18);cylinder(x,.65,z,.025,.75,wood);const leaf=mat('#647d57');for(let i=0;i<6;i++){const g=new THREE.SphereGeometry(.22,10,8);disposables.add(g);const m=new THREE.Mesh(g,leaf);m.scale.set(.5,1.7,1);m.position.set(x+Math.sin(i*2)*.18,.85+i*.07,z+Math.cos(i*2)*.15);m.rotation.z=Math.sin(i)*.7;scene.add(m);}}
  plant(.5,d-.5);artwork(.11,sofaZ,'x','#b8a58c');
  // A simplified green outdoor view; it is intentionally not a real site view.
  box(w/2,-.7,d/2,150,.2,150,mat('#a5b59a'));const skyline=mat('#c4ceca');for(let i=0;i<9;i++){const x=-18+i*7;box(x,1.5+(i%3),-15,3,3+i%3*2,4,skyline);box(x,2,d+18,3,4,3,skyline);}
  scene.add(new THREE.HemisphereLight('#f5f6ee','#888d70',2.1));scene.add(new THREE.AmbientLight('#fff1d7',.55));
  const sun=new THREE.DirectionalLight('#fff1d5',3);sun.position.set(w+8,11,d+7);sun.target.position.set(w/2,0,d/2);scene.add(sun,sun.target);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-14;sun.shadow.camera.right=14;sun.shadow.camera.top=14;sun.shadow.camera.bottom=-14;sun.shadow.normalBias=.035;sun.shadow.bias=-.0002;
  const warm=new THREE.PointLight('#fff0cf',10,12,2);warm.position.set(tableX,2.35,tableZ);scene.add(warm);
  let yaw=0,pitch=-.03,mode='walk',orbitTheta=.7,orbitPhi=.73,orbitRadius=Math.max(w,d)*1.45,running=true,frame=0,last=0,gyro=false,gyroReference=null,gyroBase=0,sensorSeen=false,drag=null,mapExpanded=false;
  const keys=new Set(),moves=new Set(),pos=new THREE.Vector3(Math.min(split-.9,3.8),1.65,d*.84),target=new THREE.Vector3(w/2,.55,d/2);
  camera.position.copy(pos);const isTouch=window.matchMedia('(pointer: coarse)').matches;if(isTouch)q('.tour-help').textContent='Хуруугаар чирж эргэн харна · Сумнуудаар алхана · План дээр дарж өрөө солино';
  const mapView=`<svg viewBox="-.25 -.25 ${w+.5} ${walkingWorld.d+.5}" role="group" aria-label="Өрөө сонгох байрны жишээ план">${rooms.map((r,i)=>`<g class="map-room" data-room="${i}" role="button" tabindex="0" aria-label="${r.name} рүү очих"><rect x="${r.rect[0]}" y="${r.rect[1]}" width="${r.rect[2]}" height="${r.rect[3]}" fill="${i%2?'#d7dfce':'#e8e6d8'}" stroke="#586a59" stroke-width=".08"/><text x="${r.rect[0]+r.rect[2]/2}" y="${r.rect[1]+r.rect[3]/2}" text-anchor="middle" dominant-baseline="middle" font-size=".25" fill="#5e715d">${r.name.replace('Ариун цэврийн өрөө','Ариун цэвэр')}</text></g>`).join('')}<g class="map-room" data-action="entry" role="button" tabindex="0" aria-label="Орцны хонгилд очих"><rect x="0" y="${d}" width="${w}" height="1.55" fill="#d2c4ae" stroke="#586a59" stroke-width=".08"/><text x="${w/2}" y="${d+.78}" text-anchor="middle" dominant-baseline="middle" font-size=".27" fill="#41382b">Орцны хонгил</text></g><path pointer-events="none" id="mapDirection" stroke="#bc8d50" stroke-width=".08"/><circle pointer-events="none" id="mapYou" r=".17" fill="#bd8d51" stroke="#fff" stroke-width=".055"/></svg>`;q('.tour-map-svg').innerHTML=mapView;
  const status=text=>q('.tour-status').textContent=text;let statusTimer;
  function notify(text){status(text);clearTimeout(statusTimer);statusTimer=setTimeout(()=>status(''),4200);}
  function resize(){const viewport=q('.tour-viewport'),width=viewport.clientWidth,height=viewport.clientHeight;renderer.setSize(width,height,false);camera.aspect=width/Math.max(1,height);camera.updateProjectionMatrix();}
  const observer=new ResizeObserver(resize);observer.observe(q('.tour-viewport'));resize();
  function fitViewport(){const v=window.visualViewport;if(!v)return;const scale=v.scale||1;dialog.style.width=`${v.width*scale}px`;dialog.style.height=`${v.height*scale}px`;dialog.style.position='fixed';dialog.style.left=`${v.offsetLeft}px`;dialog.style.top=`${v.offsetTop}px`;dialog.style.transformOrigin='top left';dialog.style.transform=`scale(${1/scale})`;resize();}
  if(window.visualViewport){on(window.visualViewport,'resize',fitViewport);on(window.visualViewport,'scroll',fitViewport);}on(window,'resize',fitViewport);fitViewport();
  function setMode(next){mode=next;dialog.classList.toggle('tour-mode-overview',mode==='overview');q('[data-action="mode"]').textContent=mode==='walk'?'▧ Дээрээс харах':'↳ Дотор алхах';q('[data-action="mode"]').setAttribute('aria-pressed',mode==='overview');for(const o of outerWalls)o.visible=mode==='walk';for(const o of ceilings)o.visible=mode==='walk';keys.clear();moves.clear();if(mode==='overview'){stopGyro();q('.tour-help').textContent='Дарж чирээд байраа эргүүлж харна · План дээр дарж өрөөнд орно';}else q('.tour-help').textContent=isTouch?'Хуруугаар чирж эргэн харна · Сумнуудаар алхана':'Хулганаа дарж чирээд эргэн харна · W A S D / сумнуудаар алхана';}
  function teleport(index){const r=rooms[index];if(!r)return;pos.set(r.x,1.65,r.z);yaw=0;pitch=-.04;stopGyro();setMode('walk');q('.tour-map').classList.remove('expanded');mapExpanded=false;q('[data-action="map"]').setAttribute('aria-expanded','false');q('[data-action="map"]').textContent='Томруулах ↗';notify(r.name+' рүү орлоо');}
  on(q('.tour-map-svg'),'click',e=>{const room=e.target.closest('[data-room]');if(room)teleport(Number(room.dataset.room));});on(q('.tour-map-svg'),'keydown',e=>{if(e.key==='Enter'||e.key===' '){const room=e.target.closest('[data-room]');if(room){e.preventDefault();teleport(Number(room.dataset.room));}else if(e.target.closest('[data-action=entry]')){e.preventDefault();goToEntrance();}}});
  function stopGyro(){gyro=false;gyroReference=null;q('[data-action="gyro"]').setAttribute('aria-pressed','false');}
  const q1=new THREE.Quaternion(-Math.sqrt(.5),0,0,Math.sqrt(.5)),q0=new THREE.Quaternion(),sensorQ=new THREE.Quaternion(),sensorEuler=new THREE.Euler(0,0,0,'YXZ'),zAxis=new THREE.Vector3(0,0,1);
  on(window,'deviceorientation',e=>{if(!gyro||e.alpha==null||e.beta==null||e.gamma==null)return;sensorSeen=true;const rad=Math.PI/180,screenAngle=(screen.orientation?.angle??window.orientation??0)*rad;sensorEuler.set(e.beta*rad,e.alpha*rad,-e.gamma*rad,'YXZ');sensorQ.setFromEuler(sensorEuler).multiply(q1).multiply(q0.setFromAxisAngle(zAxis,-screenAngle));sensorEuler.setFromQuaternion(sensorQ,'YXZ');if(gyroReference===null)gyroReference=sensorEuler.y;yaw=gyroBase+wrap(sensorEuler.y-gyroReference);pitch=clamp(sensorEuler.x,-1.2,1.2);});
  async function startGyro(){if(gyro){stopGyro();notify('Хуруугаар чирж эргэн харах горим');return;}if(!window.isSecureContext){notify('Утасны мэдрэгч HTTPS холбоосоор ажиллана.');return;}try{if(typeof DeviceOrientationEvent==='undefined'){notify('Энэ төхөөрөмж эргэлтийн мэдрэгч дэмжихгүй. Хуруугаар чирч хараарай.');return;}if(typeof DeviceOrientationEvent.requestPermission==='function'){const permission=await DeviceOrientationEvent.requestPermission();if(permission!=='granted'){notify('Мэдрэгчийн зөвшөөрөл олгосонгүй. Хуруугаар чирч харах боломжтой.');return;}}setMode('walk');gyro=true;gyroBase=yaw;gyroReference=null;sensorSeen=false;q('[data-action="gyro"]').setAttribute('aria-pressed','true');notify('Утсаа босоогоор бариад, эргүүлж хараарай.');setTimeout(()=>{if(running&&gyro&&!sensorSeen){stopGyro();notify('Мэдрэгчээс мэдээлэл ирсэнгүй. Хуруугаар чирч хараарай.');}},3500);}catch{stopGyro();notify('Мэдрэгчийг асаасангүй. Хуруугаар чирч хараарай.');}}
  function goToEntrance() {
    setMode('walk');
    stopGyro();
    pos.set(entryX, 1.65, d + 1.04);
    yaw = 0;
    pitch = 0;
    notify('Үүдний хаалган дээр дарж нээнэ.');
  }
  on(dialog,'click',e=>{const b=e.target.closest('[data-action]');if(!b)return;switch(b.dataset.action){case'close':close();break;case'entry':goToEntrance();break;case'mode':setMode(mode==='walk'?'overview':'walk');break;case'gyro':startGyro();break;case'map':mapExpanded=!mapExpanded;q('.tour-map').classList.toggle('expanded',mapExpanded);b.setAttribute('aria-expanded',mapExpanded);b.textContent=mapExpanded?'Багасгах ↙':'Томруулах ↗';break;case'share':{const link=new URL(location.href);link.searchParams.set('tour',home.id);link.hash='';navigator.clipboard?.writeText(link.href).then(()=>notify('Энэ байрны аяллын холбоос хууллаа.')).catch(()=>notify('Холбоосыг хаягийн мөрөөс хуулж болно.'));break;}case'fullscreen':if(document.fullscreenElement)document.exitFullscreen?.();else dialog.requestFullscreen?.().catch(()=>notify('Энэ браузер бүтэн дэлгэц дэмжихгүй.'));break;}});
  on(canvas,'pointerdown',e=>{if(e.button!==0&&e.pointerType==='mouse')return;if(drag)return;canvas.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY};canvas.focus({preventScroll:true});});
  on(canvas,'pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const scale=window.visualViewport?.scale||1,dx=(e.clientX-drag.x)*scale,dy=(e.clientY-drag.y)*scale;drag.x=e.clientX;drag.y=e.clientY;if(mode==='walk'){if(gyro){stopGyro();notify('Хуруугаар эргэн харах горим');}yaw-=dx*.004;pitch=clamp(pitch-dy*.004,-1.25,1.25);}else{orbitTheta-=dx*.006;orbitPhi=clamp(orbitPhi+dy*.005,.25,1.3);}});
  const ray = new THREE.Raycaster();
  function toggleDoorAt(clientX, clientY) {
    if (mode !== 'walk') return;
    const rect = canvas.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2((clientX-rect.left)/rect.width*2-1, 1-(clientY-rect.top)/rect.height*2),camera);
    const hit = ray.intersectObjects(scene.children, true)[0];
    if (!hit || hit.distance > 2.5) return;
    const door = hit.object.parent?.userData.door;
    if (!door) return;
    const oldAngle = door.pivot.rotation.y;
    door.pivot.rotation.y = door.open ? door.closedAngle : door.closedAngle + door.swing;
    updateDoorBounds(door);
    const b = door.barrier;
    if (pos.x > b.minX-.23 && pos.x < b.maxX+.23 && pos.z > b.minZ-.23 && pos.z < b.maxZ+.23) {
      door.pivot.rotation.y = oldAngle;
      updateDoorBounds(door);
      notify('Хаалганаас бага зэрэг холдоорой.');
      return;
    }
    door.open = !door.open;
    notify(door.label + (door.open ? ' · нээлттэй' : ' · хаалттай'));
  }
  const endDrag=e=>{if(drag?.id===e.pointerId)drag=null;};
  on(canvas,'pointerup',e=>{
    if(drag?.id===e.pointerId && Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)<6) toggleDoorAt(e.clientX,e.clientY);
    endDrag(e);
  });on(canvas,'pointercancel',endDrag);on(canvas,'lostpointercapture',endDrag);
  on(canvas,'wheel',e=>{if(mode==='overview'){e.preventDefault();orbitRadius=clamp(orbitRadius+e.deltaY*.015,7,32);}},{passive:false});
  const movementKeys=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];
  on(window,'keydown',e=>{if(movementKeys.includes(e.code)){e.preventDefault();keys.add(e.code);}if(e.code==='KeyE'){const rect=canvas.getBoundingClientRect();toggleDoorAt(rect.left+rect.width/2,rect.top+rect.height/2);}if(e.code==='KeyM'){e.preventDefault();setMode(mode==='walk'?'overview':'walk');}});on(window,'keyup',e=>keys.delete(e.code));
  for(const b of dialog.querySelectorAll('[data-move]')){on(b,'pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);moves.add(b.dataset.move);b.classList.add('pressed');});const release=()=>{moves.delete(b.dataset.move);b.classList.remove('pressed');};on(b,'pointerup',release);on(b,'pointercancel',release);on(b,'lostpointercapture',release);}
  function releaseInputs(){keys.clear();moves.clear();drag=null;for(const b of dialog.querySelectorAll('[data-move]'))b.classList.remove('pressed');}
  on(window,'blur',releaseInputs);on(document,'visibilitychange',()=>{if(document.hidden)releaseInputs();});on(dialog,'cancel',e=>{e.preventDefault();close();});
  function tick(t){if(!running)return;frame=requestAnimationFrame(tick);const dt=Math.min(.045,(t-(last||t))/1000);last=t;if(!document.hidden){if(mode==='walk'){let forward=(keys.has('KeyW')||keys.has('ArrowUp')||moves.has('forward')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')||moves.has('back')?1:0),side=(keys.has('KeyD')||keys.has('ArrowRight')||moves.has('right')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')||moves.has('left')?1:0);const next=moveWalker(walkingWorld,colliders,pos,yaw,forward,side,dt);pos.x=next.x;pos.z=next.z;camera.position.copy(pos);camera.rotation.set(pitch,yaw,0,'YXZ');}else{camera.position.set(target.x+Math.sin(orbitTheta)*Math.sin(orbitPhi)*orbitRadius,Math.cos(orbitPhi)*orbitRadius,target.z+Math.cos(orbitTheta)*Math.sin(orbitPhi)*orbitRadius);camera.lookAt(target);}q('#mapYou').setAttribute('cx',pos.x);q('#mapYou').setAttribute('cy',pos.z);q('#mapDirection').setAttribute('d',`M${pos.x} ${pos.z}l${-Math.sin(yaw)*.65} ${-Math.cos(yaw)*.65}`);const room=rooms.find(r=>pos.x>=r.rect[0]&&pos.x<=r.rect[0]+r.rect[2]&&pos.z>=r.rect[1]&&pos.z<=r.rect[1]+r.rect[3]);q('#tourRoomName').textContent=mode==='overview'?'Байрны бүтэн зохион байгуулалт':pos.z>d?'Орцны хонгил':room?.name||'Зочны өрөө';renderer.render(scene,camera);}}
  function close(){if(!running)return;running=false;cancelAnimationFrame(frame);clearTimeout(statusTimer);releaseInputs();stopGyro();observer.disconnect();for(const remove of events)remove();for(const item of disposables)item.dispose();renderer.dispose();renderer.forceContextLoss();if(document.fullscreenElement===dialog)document.exitFullscreen?.();dialog.close();dialog.remove();document.body.style.overflow='';active=null;const link=new URL(location.href);link.searchParams.delete('tour');history.replaceState(null,'',link);document.querySelector('#apartments')?.scrollIntoView({block:'start',behavior:'instant'});}
  const link=new URL(location.href);link.searchParams.set('tour',home.id);history.replaceState(null,'',link);active={close};if(Number.isInteger(startRoom))teleport(startRoom);frame=requestAnimationFrame(tick);notify('Хаалган дээр дарж нээнэ. План дээр дарж өрөө солино.');
}

