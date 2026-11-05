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
const inventoryKey = 'oron.inventory.v1';
const viewingKey = 'oron.viewings.v1';
function readLocal(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function writeLocal(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
}
const inventory = readLocal(inventoryKey, {});
for (const home of homes) {
  const override = inventory?.[home.id];
  if (Number.isSafeInteger(override?.price) && override.price > 0 && typeof override.reserved === 'boolean') {
    Object.assign(home, {price:override.price, reserved:override.reserved});
  }
}
const projectFilter = $('projectFilter');
for (const stage of ['Ашиглалтад орсон', 'Баригдаж буй']) {
  const group = document.createElement('optgroup');
  group.label = stage;
  for (const project of projects.filter(item => item.stage === stage)) {
    group.append(new Option(project.name, project.id));
  }
  projectFilter.append(group);
}
projectFilter.value = projectId;
chosen = homes.find(h => h.id === 'A-302');
const money=n=>new Intl.NumberFormat('mn-MN',{maximumFractionDigits:0}).format(Math.round(n))+' ₮';
const millions=n=>(n/1e6).toFixed(2).replace(/0+$/,'').replace(/\.$/,'');
function plan(h,large=false){return floorPlanMarkup(h,large);}
function renderFloors(){$('floorButtons').innerHTML=[5,4,3,2,1].map(n=>`<button class="floor-btn ${n===floor?'selected':''}" data-floor="${n}" aria-pressed="${n===floor}"><strong>${n}-р давхар</strong><span>${homes.filter(h=>h.project.id===projectId&&h.floor===n&&!h.reserved).length} байр сул</span></button>`).join('');$('floorFilter').value=String(floor);$('floorSpot').innerHTML=`${floor ? floor + '-р давхар' : 'Бүх давхар'} <span>→</span>`;$('floorSpot').dataset.position=`16m ${1.7+(Math.max(1,floor)-1)*3.1}m 2m`;viewer.updateHotspot?.({name:'hotspot-floor',position:$('floorSpot').dataset.position});}
const compared = new Set();
function matchingHomes() {
  const rooms = $('roomFilter').value;
  const maximum = $('maxPrice').valueAsNumber;
  const minimum = $('minArea').valueAsNumber;
  return homes.filter(home =>
    home.project.id === projectId &&
    (!floor || home.floor === floor) &&
    (rooms === 'all' || home.rooms === Number(rooms)) &&
    (!Number.isFinite(maximum) || home.price <= maximum * 1e6) &&
    (!Number.isFinite(minimum) || home.area >= minimum) &&
    (!$('availableOnly').checked || !home.reserved)
  );
}
function renderHomes() {
  const filtered = matchingHomes();
  $('listingStatus').textContent = `${filtered.length} байр · ${floor ? floor + '-р давхар' : 'Бүх давхар'} · Жишээ мэдээлэл`;
  $('apartmentGrid').innerHTML = filtered.map(home => `
    <article class="apartment-card ${home.id === chosen.id ? 'chosen' : ''}">
      <div class="plan-preview"><span class="status ${home.reserved ? 'reserved' : ''}">${home.reserved ? 'Захиалсан' : 'Сул'}</span>${plan(home)}</div>
      <div class="card-info">
        <div class="card-top"><h3>${home.id}</h3><span>${home.rooms} өрөө</span></div>
        <p class="card-spec">${home.area} м² · ${home.side} зүг</p>
        <div class="card-price">${millions(home.price)} <small>сая ₮</small></div>
        <button class="card-button" data-home="${home.id}">План, үнэ харах <span>↗</span></button>
        <button class="compare-toggle" data-compare="${home.id}" aria-pressed="${compared.has(home.id)}">${compared.has(home.id) ? '✓ Сонгосон' : '+ Харьцуулах'}</button>
      </div>
    </article>`).join('') || '<p class="empty">Тохирох байр олдсонгүй. Шүүлтээ өөрчлөөрэй.</p>';
  $('compareButton').textContent = `Харьцуулах · ${compared.size}/2`;
  $('compareButton').disabled = compared.size !== 2;
  $('floorMapButton').disabled = !floor;
}

function showCatalogDialog(title, content) {
  $('catalogDialogTitle').textContent = title;
  $('catalogDialogBody').innerHTML = content;
  $('catalogDialog').showModal();
}
$('closeCatalogDialog').addEventListener('click', () => $('catalogDialog').close());
$('compareButton').addEventListener('click', () => {
  const pct = Number($('downpayment').value);
  const duration = $('termMonths').valueAsNumber;
  const valid = Number.isInteger(duration) && duration >= 1 && duration <= 360;
  const cards = [...compared].map(id => {
    const home = homes.find(item => item.id === id);
    const down = home.price * pct / 100;
    return `<article><h3>${home.id}</h3><p>${home.project.name}</p>${plan(home)}<dl>
      <dt>Талбай</dt><dd>${home.area} м²</dd><dt>Өрөө</dt><dd>${home.rooms}</dd>
      <dt>Цонхны зүг</dt><dd>${home.side}</dd><dt>Нийт үнэ</dt><dd>${money(home.price)}</dd>
      <dt>Урьдчилгаа</dt><dd>${money(down)}</dd>
      <dt>Сарын төлбөр</dt><dd>${valid ? money((home.price-down)/duration) : '—'}</dd>
    </dl><button class="card-button" data-home="${home.id}">Дэлгэрэнгүй ↗</button></article>`;
  }).join('');
  showCatalogDialog('Хоёр байр харьцуулах', `<p>${pct}% урьдчилгаа · ${valid ? duration + ' сар' : 'Хугацаагаа тохируулна уу'} · хүүгүй жишээ</p><div class="compare-grid">${cards}</div>`);
});
$('floorMapButton').addEventListener('click', () => {
  const units = homes.filter(home => home.project.id === projectId && home.floor === floor);
  showCatalogDialog(`${floor}-р давхрын схем`, `<p>Байрны байршлыг харуулах жишээ схем.</p><div class="unit-map">${units.map(home => `
    <button data-home="${home.id}" class="${home.reserved ? 'reserved' : ''}">${home.id}<small>${home.rooms} өрөө · ${home.reserved ? 'Захиалсан' : 'Сул'}</small></button>`).join('')}</div>`);
});
for (const id of ['maxPrice','minArea','availableOnly']) $(id).addEventListener('input', renderHomes);
$('resetFilters').addEventListener('click', () => {
  floor = 0;
  $('roomFilter').value = 'all';
  $('maxPrice').value = '';
  $('minArea').value = '';
  $('availableOnly').checked = false;
  renderFloors();
  renderHomes();
});
function calculate(){
  const field = $('termMonths');
  months = field.valueAsNumber;
  const valid = Number.isInteger(months) && months >= 1 && months <= 360;
  field.setAttribute('aria-invalid', String(!valid));
  $('termHelp').textContent = valid ? '1–360 сар оруулах эсвэл доорх товчоос сонгоно.' : '1–360 хүртэл бүхэл тоо оруулна уу.';
  for (const button of $('terms').children) {
    const selected = valid && Number(button.dataset.months) === months;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  }
  const pct=Number($('downpayment').value),down=chosen.price*pct/100,monthly=(chosen.price-down)/months;$('calcApartment').textContent=`${chosen.project.name} · ${chosen.id} · ${chosen.rooms} өрөө · ${chosen.area} м²`;$('totalPrice').textContent=money(chosen.price);$('downPercent').textContent=pct+'%';$('downAmount').textContent=money(down);$('monthlyAmount').textContent=valid ? money(monthly) : '—';}
$('floorButtons').addEventListener('click',e=>{const b=e.target.closest('[data-floor]');if(!b)return;floor=Number(b.dataset.floor);renderFloors();renderHomes();});
$('roomFilter').addEventListener('change',renderHomes);
$('floorFilter').addEventListener('change',e=>{floor=Number(e.target.value);renderFloors();renderHomes();});
function showApartment(home) {
  if (!home) return;
  dialogApartment = home;
  $('dialogTitle').textContent = `${home.id} · ${home.rooms} өрөө`;
  $('dialogPlan').innerHTML = plan(home,true);
  $('dialogDetails').innerHTML = `<span>${home.project.name}<br>${home.floor}-р давхар · ${home.area} м² · ${home.side} зүг</span><strong>${money(home.price)}</strong>`;
  $('copyStatus').textContent = '';
  $('viewingButton').disabled = home.reserved;
  $('panoramaButton').hidden = home.id !== 'A-302';
  $('planDialog').showModal();
}
$('apartmentGrid').addEventListener('click', event => {
  const details = event.target.closest('[data-home]');
  if (details) return showApartment(homes.find(home => home.id === details.dataset.home));
  const button = event.target.closest('[data-compare]');
  if (!button) return;
  const id = button.dataset.compare;
  if (compared.has(id)) compared.delete(id);
  else if (compared.size < 2) compared.add(id);
  else {
    $('compareStatus').textContent = 'Хоёроос нэгийг хасаад дахин сонгоно уу.';
    return;
  }
  $('compareStatus').textContent = `Сонгосон: ${[...compared].join(', ') || '—'}`;
  renderHomes();
  $('apartmentGrid').querySelector(`[data-compare="${id}"]`)?.focus({preventScroll:true});
});
$('catalogDialogBody').addEventListener('click', event => {
  const button = event.target.closest('[data-home]');
  if (!button) return;
  $('catalogDialog').close();
  showApartment(homes.find(home => home.id === button.dataset.home));
});
$('copyApartment').addEventListener('click', async () => {
  const url = new URL(location.href);
  url.searchParams.delete('tour');
  url.searchParams.set('apartment', dialogApartment.id);
  url.hash = 'apartments';
  try {
    await navigator.clipboard.writeText(url.href);
    $('copyStatus').textContent = 'Байрны холбоос хууллаа.';
  } catch {
    $('copyStatus').textContent = url.href;
  }
});
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
projectFilter.addEventListener('change', event => {
  projectId = event.target.value;
  if (projectId !== 'A') viewer.autoRotate = false;
  $('explore').hidden = projectId !== 'A';
  for (const link of document.querySelectorAll('a[href="#explore"]')) link.hidden = projectId !== 'A';
  chosen = homes.find(home => home.project.id === projectId && (!floor || home.floor === floor) && !home.reserved)
    ?? homes.find(home => home.project.id === projectId && (!floor || home.floor === floor));
  renderFloors();
  renderHomes();
  calculate();
});
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

const sharedHome = homes.find(home => home.id === new URL(location.href).searchParams.get('apartment'));
if (!linkedHome && sharedHome) {
  floor = sharedHome.floor;
  projectFilter.value = sharedHome.project.id;
  projectFilter.dispatchEvent(new Event('change'));
  showApartment(sharedHome);
}

$('inventoryButton').addEventListener('click', () => {
  const units = homes.filter(home => home.project.id === projectId && (!floor || home.floor === floor));
  showCatalogDialog('Үнэ, төлөв засах', `<p>Демо удирдлага. Өөрчлөлт энэ браузерт хадгалагдана.</p>
    <form id="inventoryForm" class="catalog-form">
      <label>Байр<select name="unit">${units.map(home => `<option value="${home.id}">${home.id}</option>`).join('')}</select></label>
      <label>Нийт үнэ (₮)<input name="price" type="number" min="1" max="100000000000" step="1" required></label>
      <label><input name="reserved" type="checkbox"> Захиалсан</label>
      <button class="card-button">Хадгалах</button><p role="status"></p>
    </form>`);
  const form = $('inventoryForm');
  const unit = form.elements.unit;
  function loadUnit() {
    const home = units.find(item => item.id === unit.value);
    form.elements.price.value = home.price;
    form.elements.reserved.checked = home.reserved;
    form.querySelector('[role=status]').textContent = '';
  }
  unit.addEventListener('change', loadUnit);
  loadUnit();
  form.addEventListener('submit', event => {
    event.preventDefault();
    const home = units.find(item => item.id === unit.value);
    const next = {price:form.elements.price.valueAsNumber, reserved:form.elements.reserved.checked};
    if (!writeLocal(inventoryKey, {...inventory, [home.id]:next})) {
      form.querySelector('[role=status]').textContent = 'Браузерт хадгалж чадсангүй.';
      return;
    }
    inventory[home.id] = next;
    Object.assign(home, next);
    renderFloors();
    renderHomes();
    calculate();
    form.querySelector('[role=status]').textContent = home.id + ' шинэчлэгдлээ.';
  });
});
$('viewingButton').addEventListener('click', () => {
  const home = dialogApartment;
  if (!home || home.reserved) return;
  $('planDialog').close();
  showCatalogDialog('Үзлэгийн хүсэлт · демо', `<p>${home.project.name} · ${home.id}</p>
    <p>Туршилтын хүсэлт энэ браузерт хадгалагдана.</p>
    <form id="viewingForm" class="catalog-form">
      <label>Үзэх өдөр<input name="date" type="date" required></label>
      <label>Цаг<select name="time"><option>10:00</option><option>12:00</option><option>14:00</option><option>16:00</option></select></label>
      <button class="card-button">Демо хүсэлт бүртгэх</button><p role="status"></p>
    </form>`);
  const form = $('viewingForm');
  const now = new Date();
  form.elements.date.min = [now.getFullYear(), String(now.getMonth()+1).padStart(2,'0'), String(now.getDate()).padStart(2,'0')].join('-');
  form.addEventListener('submit', event => {
    event.preventDefault();
    const saved = readLocal(viewingKey, []);
    const request = {unit:home.id, date:form.elements.date.value, time:form.elements.time.value};
    const ok = writeLocal(viewingKey, [...(Array.isArray(saved) ? saved : []), request].slice(-50));
    form.querySelector('[role=status]').textContent = ok ? 'Демо хүсэлт бүртгэгдлээ.' : 'Браузерт хадгалж чадсангүй.';
    if (ok) form.querySelector('button').disabled = true;
  });
});

$('panoramaButton').addEventListener('click', async () => {
  const button = $('panoramaButton');
  button.disabled = true;
  try {
    const {openPanorama} = await import('./panorama.js');
    $('planDialog').close();
    showCatalogDialog('Midnight Jade · Интерьер 360°', `<p>AI-аар бүтээсэн интерьерийн концепц. Чирж эсвэл сум дараад эргэн харна.</p>
      <div id="panoramaRooms" class="catalog-actions"></div><div id="panoramaViewport" class="panorama-viewport"></div>`);
    openPanorama($('catalogDialog'), $('panoramaViewport'), $('panoramaRooms'));
  } catch {
    $('copyStatus').textContent = '360° үзүүлэнг нээж чадсангүй.';
  } finally {
    button.disabled = false;
  }
});
