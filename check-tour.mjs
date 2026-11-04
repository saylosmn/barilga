import assert from 'node:assert/strict';
import {layoutFor,floorPlanMarkup,canOccupy,moveWalker} from './dist/apartment-layout.js';
for(const home of [{rooms:1,area:38.6},{rooms:2,area:62.4},{rooms:2,area:58.8},{rooms:3,area:84.2}]){
  const l=layoutFor(home);assert.ok(Math.abs(l.w*l.d-home.area)<1e-8,'Plan dimensions match displayed sample area');
  for(const r of l.rooms){assert.ok(r.x>0&&r.x<l.w&&r.z>0&&r.z<l.d);assert.ok(r.rect[0]>=0&&r.rect[1]>=0&&r.rect[0]+r.rect[2]<=l.w+1e-8&&r.rect[1]+r.rect[3]<=l.d+1e-8);}
  assert.equal((floorPlanMarkup(home,true).match(/data-entryroom=/g)||[]).length,l.rooms.length);
}
const world={w:10,d:8},wall=[{minX:4.9,maxX:5.1,minZ:0,maxZ:3.45},{minX:4.9,maxX:5.1,minZ:4.55,maxZ:8}];
assert.equal(canOccupy(world,wall,5,2),false,'Walls cannot be crossed');
assert.equal(canOccupy(world,wall,5,4),true,'Doorway remains traversable');
assert.equal(canOccupy(world,wall,.1,3),false,'Perimeter keeps the viewer inside');
let pos={x:4,z:4};for(let i=0;i<80;i++)pos=moveWalker(world,wall,pos,0,0,1,1/60);assert.ok(pos.x>6,'Walk through an open door');
pos={x:4,z:2};for(let i=0;i<80;i++)pos=moveWalker(world,wall,pos,0,0,1,1/60);assert.ok(pos.x<4.7,'Walking stops before a wall');
const straight=moveWalker(world,[],{x:2,z:2},0,1,0,.04),diagonal=moveWalker(world,[],{x:2,z:2},0,1,1,.04);
assert.ok(Math.abs(Math.hypot(straight.x-2,straight.z-2)-Math.hypot(diagonal.x-2,diagonal.z-2))<1e-8,'Diagonal walking is not faster');
assert.ok(Math.abs(moveWalker(world,[],{x:2,z:2},0,1,0,9).z-2)<.11,'Suspending the tab cannot teleport through walls');
console.log('Tour layout, plan links, door passage, collisions, diagonal speed and frame-time checks passed.');
