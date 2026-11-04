export function layoutFor(home){
  const w=home.rooms===1?6.6:home.rooms===2?9.6:11.8,d=home.area/w,split=home.rooms===1?w:w*.59;
  const rooms=[{name:'Зочны өрөө',x:split*.72,z:d*.84,rect:[0,2.2,split,d-2.2]}];
  if(home.rooms>1)rooms.push({name:'Унтлагын өрөө',x:split+.85,z:home.rooms===3?d*.27:d*.7,rect:[split,0,w-split,home.rooms===3?d*.53:d]});
  if(home.rooms===3)rooms.push({name:'Хүүхдийн өрөө',x:split+.85,z:d*.78,rect:[split,d*.53,w-split,d*.47]});
  rooms.push({name:'Гал тогоо',x:3.5,z:1.9,rect:[2.2,0,split-2.2,2.2]},{name:'Ариун цэврийн өрөө',x:1.25,z:1.2,rect:[0,0,2.2,2.2]});
  return {w,d,split,rooms};
}
export function canOccupy(world,colliders,x,z,r=.22){
  if(x<r||x>world.w-r||z<r||z>world.d-r)return false;
  return !colliders.some(b=>x>b.minX-r&&x<b.maxX+r&&z>b.minZ-r&&z<b.maxZ+r);
}
export function moveWalker(world,colliders,pos,yaw,forward,side,dt){
  const norm=Math.hypot(forward,side)||1,step=2.2*Math.min(.045,Math.max(0,dt))/norm;
  const dx=(-Math.sin(yaw)*forward+Math.cos(yaw)*side)*step,dz=(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*step;
  const x=canOccupy(world,colliders,pos.x+dx,pos.z)?pos.x+dx:pos.x;
  const z=canOccupy(world,colliders,x,pos.z+dz)?pos.z+dz:pos.z;
  return {x,z};
}
export function floorPlanMarkup(home,interactive=false){
  const {w,d,split,rooms}=layoutFor(home);
  const roomMarkup=rooms.map((r,i)=>`<g ${interactive?`class="plan-room" data-entryroom="${i}" tabindex="0" role="button" aria-label="${r.name} дотор 3D-ээр орох"`:''}><rect x="${r.rect[0]}" y="${r.rect[1]}" width="${r.rect[2]}" height="${r.rect[3]}" fill="${i%2?'#dbe0d1':'#ece9dc'}" stroke="#526451" stroke-width=".08"/><text x="${r.rect[0]+r.rect[2]/2}" y="${r.rect[1]+r.rect[3]-.3}" font-family="sans-serif" font-size=".24" text-anchor="middle" fill="#68775d">${r.name.replace('Ариун цэврийн өрөө','Ариун цэвэр')}</text></g>`).join('');
  let furniture=`<g pointer-events="none" fill="#a6b198"><rect x=".35" y="${d*.64-1.15}" width="1.3" height="2.3" rx=".1"/><rect x="2.22" y="${d*.64-.6}" width=".95" height="1.2" rx=".1" fill="#c5ae89"/><rect x="2.28" y=".12" width="2.7" height=".65" fill="#c5ae89"/><rect x=".15" y=".2" width=".65" height=".5" fill="#f9f8f1"/><rect x="1.2" y=".1" width=".85" height=".85" fill="#f9f8f1"/>`;
  function bed(x,z,bw,bd){return `<rect x="${x-bw/2}" y="${z-bd/2}" width="${bw}" height="${bd}" rx=".06"/><rect x="${x-bw*.4}" y="${z-bd*.45}" width="${bw*.8}" height=".4" rx=".04" fill="#f9f8f1"/>`;}
  if(home.rooms===1)furniture+=bed(w-1.2,d*.61,1.7,2.1);else if(home.rooms===2)furniture+=bed(split+(w-split)*.67,d*.43,1.8,2.15);else furniture+=bed(split+(w-split)*.67,d*.26,1.6,2)+bed(split+(w-split)*.67,d*.77,1.2,1.95);
  furniture+='</g>';
  return `<svg viewBox="-.4 -.4 ${w+.8} ${d+.8}" role="img" aria-label="${home.rooms} өрөөний жишээ план${interactive?' — өрөөн дээр дарж дотор нь орно':''}">${roomMarkup}${furniture}<rect x="0" y="0" width="${w}" height="${d}" fill="none" stroke="#46594b" stroke-width=".12" pointer-events="none"/></svg>`;
}
