const COLORS={ATTIVO:"#16a34a",INATTIVO:"#dc2626","STAND BY":"#f97316"};
const map=L.map("map",{zoomControl:true}).setView([42.5,12.5],6);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap"}).addTo(map);
let customers=[],markers=[];
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
function markerIcon(status){return L.divIcon({className:"",html:`<div class="pin" style="background:${COLORS[status]||"#64748b"}"></div>`,iconSize:[22,22],iconAnchor:[11,22]})}
function popup(r){return `<b>${esc(r.name)}</b><br>${esc(r.city)}${r.province?` (${esc(r.province)})`:""}<br>${esc(r.region)}<br><b>${esc(r.status)}</b>`}
function render(){
  markers.forEach(m=>map.removeLayer(m)); markers=[];
  const q=$("search").value.trim().toLowerCase(), st=$("status").value, rg=$("region").value;
  let visible=0;
  customers.forEach(r=>{
    if(st&&r.status!==st) return;
    if(rg&&r.region!==rg) return;
    const hay=[r.name,r.city,r.province,r.region].join(" ").toLowerCase();
    if(q&&!hay.includes(q)) return;
    if(r.lat==null||r.lng==null) return;
    visible++;
    const m=L.marker([Number(r.lat),Number(r.lng)],{icon:markerIcon(r.status)}).addTo(map).bindPopup(popup(r));
    markers.push(m);
  });
  $("visible").textContent=visible;
}
fetch("data/customers.json?ts="+Date.now()).then(r=>{if(!r.ok)throw new Error("HTTP "+r.status);return r.json()}).then(data=>{
  customers=data;
  $("total").textContent=data.length;
  $("active").textContent=data.filter(x=>x.status==="ATTIVO").length;
  $("inactive").textContent=data.filter(x=>x.status==="INATTIVO").length;
  $("standby").textContent=data.filter(x=>x.status==="STAND BY").length;
  $("mapped").textContent=data.filter(x=>x.lat!=null&&x.lng!=null).length;
  [...new Set(data.map(x=>x.region).filter(Boolean))].sort().forEach(x=>$("region").add(new Option(x,x)));
  $("statusBox").innerHTML=`Database caricato: <b>${data.length}</b> clienti. La pagina è pronta per ricevere aggiornamenti automatici da n8n.`;
  render();
}).catch(e=>$("statusBox").textContent="Errore nel caricamento del database: "+e.message);
["search","status","region"].forEach(id=>$(id).addEventListener(id==="search"?"input":"change",render));
$("reset").onclick=()=>{$("search").value="";$("status").value="";$("region").value="";render();map.setView([42.5,12.5],6)};