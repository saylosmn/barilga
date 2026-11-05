import {floorPlanMarkup} from './apartment-layout.js';
const $=id=>document.getElementById(id);
const viewer=$('building');
let floor=3,months=24,chosen=null,dialogApartment=null,loaded=false,night=false;
const types=[{rooms:1,area:38.6,side:'Зүүн'},{rooms:2,area:62.4,side:'Өмнө'},{rooms:3,area:84.2,side:'Баруун'},{rooms:2,area:58.8,side:'Өмнө'}];
const projects = [
  {id:'A', name:'ОРОН Residence', stage:'Ашиглалтад орсон', rate:3.2},
  {id:'B', name:'Нарлаг өргөө', stage:'Баригдаж буй', rate:2.85},
  {id:'C', name:'Саруул хотхон', stage:'Баригдаж буй', rate:3.05},
  {id:'D', name:'Хангай резиденс', stage:'Ашиглалтад орсон', rate:3.5},
  {id:'E', name:'Төгөл хотхон', stage:'Ашиглалтад орсон', rate:3.75},
];
let projectId = 'A';
const homes = projects.flatMap(project => Array.from({length:5}, (_,i) =>
  types.map((type,j) => ({
    ...type, project, floor:i+1, id:`${project.id}-${i+1}0${j+1}`,
    price:Math.round(type.area*(project.rate+i*.05)*1e6), reserved:(i+j)%5===3,
  }))
).flat());
$('projectFilter').innerHTML = ['Баригдаж буй','Ашиглалтад орсон'].map(stage =>
  `<optgroup label="${stage} · жишээ">${projects.filter(p => p.stage === stage)
    .map(p => `<option value="${p.id}">${p.name}</option>`).join('')}</optgroup>`
).join('');
$('projectFilter').value = projectId;
chosen = homes.find(h => h.id === 'A-302');
const money=n=>new Intl.NumberFormat('mn-MN',{maximumFractionDigits:0}).format(Math.round(n))+' ₮';
const millions=n=>(n/1e6).toFixed(2).replace(/0+$/,'').replace(/\.$/,'');
function plan(h,large=false){return floorPlanMarkup(h,large);}
function renderFloors(){$('floorButtons').innerHTML=[5,4,3,2,1].map(n=>`<button class="floor-btn ${n===floor?'selected':''}" data-floor="${n}" aria-pressed="${n===floor}"><strong>${n}-р давхар</strong><span>${homes.filter(h=>h.project.id===projectId&&h.floor===n&&!h.reserved).length} байр сул</span></button>`).join('');$('floorFilter').value=String(floor);$('floorSpot').innerHTML=`${floor}-р давхар <span>→</span>`;$('floorSpot').dataset.position=`16m ${1.7+(floor-1)*3.1}m 2m`;viewer.updateHotspot?.({name:'hotspot-floor',position:$('floorSpot').dataset.position});}
function renderHomes(){const filtered=homes.filter(h=>h.project.id===projectId&&h.floor===floor&&($('roomFilter').value==='all'||h.rooms===Number($('roomFilter').value)));$('listingStatus').textContent=filtered.length ? `${filtered.length} байр · ${floor}-р давхар · ${filtered[0].project.stage} (жишээ)` : '';$('apartmentGrid').innerHTML=filtered.length?filtered.map(h=>`<article class="apartment-card ${h.id===chosen.id?'chosen':''}"><div class="plan-preview"><span class="status ${h.reserved?'reserved':''}">${h.reserved?'Захиалсан':'Боломжтой'}</span>${plan(h)}</div><div class="card-info"><div class="card-top"><h3>${h.id}</h3><span>${h.rooms} өрөө</span></div><p class="card-spec">${h.area} м² &nbsp; · &nbsp; ${h.side} зүг</p><div class="card-price">${millions(h.price)} <small>сая ₮</small></div><button class="card-button" data-home="${h.id}">План, үнэ харах <span>↗</span></button></div></article>`).join(''):'<p class="empty">Энэ давхарт сонгосон өрөөний тоотой байр алга. Өөр давхар сонгоорой.</p>';}
function calculate(){
  const field = $('termMonths');
  months = field.valueAsNumber;
  const valid = Number.isInteger(months) && months >= 1 && months <= 360;
  field.setAttribute('aria-invalid', String(!valid));
  $('termHelp').textContent = valid ? '1–360 сар оруулах эсвэл доорх товчоос сонгоно.' : '1–360 хүртэл бүхэл тоо оруулна уу.';
  $('savePlan').disabled = !valid;
  for (const button of $('terms').children) {
    const selected = valid && Number(button.dataset.months) === months;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  }
  const pct=Number($('downpayment').value),down=chosen.price*pct/100,monthly=(chosen.price-down)/months;$('calcApartment').textContent=`${chosen.project.name} · ${chosen.id} · ${chosen.rooms} өрөө · ${chosen.area} м²`;$('totalPrice').textContent=money(chosen.price);$('downPercent').textContent=pct+'%';$('downAmount').textContent=money(down);$('monthlyAmount').textContent=valid ? money(monthly) : '—';$('saveStatus').textContent='';return {pct,down,monthly};}
$('floorButtons').addEventListener('click',e=>{const b=e.target.closest('[data-floor]');if(!b)return;floor=Number(b.dataset.floor);renderFloors();renderHomes();});
$('roomFilter').addEventListener('change',renderHomes);
$('floorFilter').addEventListener('change',e=>{floor=Number(e.target.value);renderFloors();renderHomes();});
$('apartmentGrid').addEventListener('click',e=>{const b=e.target.closest('[data-home]');if(!b)return;dialogApartment=homes.find(h=>h.id===b.dataset.home);$('dialogTitle').textContent=`${dialogApartment.id} · ${dialogApartment.rooms} өрөө`;$('dialogPlan').innerHTML=plan(dialogApartment,true);$('dialogDetails').innerHTML=`<span>${dialogApartment.floor}-р давхар · ${dialogApartment.area} м²<br>${dialogApartment.side} зүг</span><strong>${money(dialogApartment.price)}</strong>`;$('planDialog').showModal();});
$('closeDialog').addEventListener('click',()=>$('planDialog').close());$('planDialog').addEventListener('click',e=>{if(e.target===$('planDialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
$('useApartment').addEventListener('click',()=>{chosen=dialogApartment;calculate();renderHomes();$('planDialog').close();$('payment').scrollIntoView({behavior:'smooth'});});
$('changeHome').addEventListener('click',()=>$('apartments').scrollIntoView({behavior:'smooth'}));$('downpayment').addEventListener('input',calculate);
$('termMonths').addEventListener('input', calculate);
$('terms').addEventListener('click', event => {
  const button = event.target.closest('[data-months]');
  if (!button) return;
  $('termMonths').value = button.dataset.months;
  calculate();
});
$('projectFilter').addEventListener('change', event => {
  projectId = event.target.value;
  if (projectId !== 'A') viewer.autoRotate = false;
  $('explore').hidden = projectId !== 'A';
  for (const link of document.querySelectorAll('a[href="#explore"]')) link.hidden = projectId !== 'A';
  chosen = homes.find(home => home.project.id === projectId && home.floor === floor && !home.reserved);
  renderFloors();
  renderHomes();
  calculate();
});
$('savePlan').addEventListener('click',()=>{const c=calculate(),text=`ОРОН RESIDENCE — ЖИШЭЭ ТООЦОО\n\nТөсөл: ${chosen.project.name}\nБайр: ${chosen.id}\nДавхар: ${chosen.floor}\nӨрөө: ${chosen.rooms}\nТалбай: ${chosen.area} м²\nНийт үнэ: ${money(chosen.price)}\nУрьдчилгаа: ${c.pct}% — ${money(c.down)}\nХугацаа: ${months} сар\nСарын төлбөр: ${money(c.monthly)}\n\nТуршилтын мэдээлэл. Хүү, шимтгэл ороогүй. Бодит борлуулалт болон зээлийн санал биш.`,url=URL.createObjectURL(new Blob(['\uFEFF'+text],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=`ORON-${chosen.id}-тооцоо.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);$('saveStatus').textContent='Тооцоо файл болж татагдлаа.';});
function startModel(){loaded=true;$('modelError').hidden=true;$('loadModel').style.pointerEvents='none';$('loadModel').querySelector('strong').textContent='3D модель ачаалж байна…';viewer.src='assets/building.glb';viewer.dismissPoster?.();}
$('loadModel').addEventListener('click',startModel);$('retryModel').addEventListener('click',()=>{viewer.removeAttribute('src');setTimeout(startModel,50);});
viewer.addEventListener('load',()=>{viewer.dismissPoster();viewer.cameraTarget='16m 9m -4.7m';viewer.cameraOrbit='35deg 72deg 52m';viewer.jumpCameraToGoal();$('sceneLabel').textContent='ИНТЕРАКТИВ 3D ОРЧИН';$('floorSpot').style.display='block';$('loadModel').style.display='none';});
viewer.addEventListener('progress',e=>{$('progressBar').style.width=e.detail.totalProgress*100+'%';});viewer.addEventListener('error',()=>{$('modelError').hidden=false;});
$('floorSpot').addEventListener('click',()=>$('apartments').scrollIntoView({behavior:'smooth'}));
$('rotate').addEventListener('click',()=>{if(!loaded)startModel();viewer.autoRotate=!viewer.autoRotate;$('rotate').classList.toggle('selected',viewer.autoRotate);$('rotate').setAttribute('aria-pressed',viewer.autoRotate);});
$('reset').addEventListener('click',()=>{viewer.cameraTarget='16m 9m -4.7m';viewer.cameraOrbit='35deg 72deg 65m';viewer.fieldOfView='36deg';viewer.autoRotate=false;$('rotate').classList.remove('selected');});
$('themeToggle').addEventListener('click',()=>{if(!loaded)startModel();night=!night;viewer.exposure=night?.55:1.15;viewer.style.background=night?'#1e2b33':'#d7d8d1';$('themeToggle').innerHTML=night?'☾ <span>Орой</span>':'☀ <span>Өдөр</span>';});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(viewer.parentElement.requestFullscreen)await viewer.parentElement.requestFullscreen();else{viewer.scrollIntoView({behavior:'smooth'});}}catch{$('sceneLabel').textContent='Бүтэн дэлгэц дэмжигдэхгүй';}});
renderFloors();renderHomes();calculate();
$('modelSize').textContent='5.9 MB';
let tourModule;
async function openInterior(home,startRoom){
  const button=$('openTour');button.disabled=true;button.textContent='3D орчин бэлдэж байна…';
  try{tourModule=await import('./tour.js');$('planDialog').close();viewer.autoRotate=false;tourModule.openTour(home,startRoom);}
  catch(error){button.textContent='Ачаалсангүй · дахин оролдох';console.error(error);}
  finally{button.disabled=false;if(tourModule)button.innerHTML='Байран дотор алхаж үзэх <span>→</span>';}
}
$('openTour').addEventListener('click',()=>{if(dialogApartment)openInterior(dialogApartment);});
function enterPlanRoom(e){const room=e.target.closest('[data-entryroom]');if(room&&dialogApartment)openInterior(dialogApartment,Number(room.dataset.entryroom));}
$('dialogPlan').addEventListener('click',enterPlanRoom);
$('dialogPlan').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();enterPlanRoom(e);}});
const linkedHome=homes.find(h=>h.id===new URL(location.href).searchParams.get('tour'));
if(linkedHome)openInterior(linkedHome);
