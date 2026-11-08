(function(){
"use strict";
if(document.body.getAttribute("data-os-project-slug")!=="mahindra-luminare")return;
var saleRoot=document.getElementById("ff-project-sale-preview");var leaseRoot=document.getElementById("ff-project-lease-preview");if(!saleRoot&&!leaseRoot)return;
function el(tag,cls,value){var n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n;}
function validPath(value){try{var u=new URL(value,location.origin);return u.origin===location.origin&&/^\/listings\//.test(u.pathname)?u.pathname:"";}catch(_){return "";}}
var verified=(Array.isArray(window.FF_LISTINGS)?window.FF_LISTINGS:[]).filter(function(x){return x&&String(x.project).trim().toLowerCase()==="mahindra luminare"&&String(x.status).toLowerCase()==="verified"&&String(x.availability).toLowerCase()==="available"&&String(x.type).toLowerCase()==="sale"&&validPath(x.detailUrl);});
var local=/^(localhost|127\.0\.0\.1)$/.test(location.hostname);
var demos=local&&!verified.length?[
{bhk:"3BHK + 3T + SQ",size:"3008 Sq. Ft.",floor:"Higher Floor",price:"₹7.00 Cr",image:"/projects/mahindra-luminare/images/med-mu7bwls7-g128g-desktop.webp"},
{bhk:"3BHK + 3T",size:"2980 Sq. Ft.",floor:"Middle Floor",price:"₹6.50 Cr",image:"/projects/mahindra-luminare/images/med-mu7bwm4a-pur2p-desktop.webp"},
{bhk:"4BHK + 4T + SQ",size:"4200 Sq. Ft.",floor:"Higher Floor",price:"₹9.25 Cr",image:"/projects/mahindra-luminare/images/med-mu7bwmm4-8w8mx-desktop.webp"}]:[];
function card(x,demo,renting){var art=el("article","ff-inventory-card");var photo=el("div","ff-inventory-photo");var img=el("img");img.src=x.image||"";img.alt="Mahindra Luminare "+(renting?"rental":"sale")+" illustration";img.loading="lazy";photo.appendChild(img);if(demo)photo.appendChild(el("span","ff-inventory-demo-label","DEMO · Not a real listing"));var body=el("div","ff-inventory-card-body");var bhk=(String(x.bhk||"").match(/\d+\s*BHK/i)||["Flat"])[0].replace(/\s+/g,"");body.append(el("h3","",bhk+" Flat on "+(renting?"Rent":"Sale")+" in Mahindra Luminare"),el("p","ff-inventory-location","Sector 59, Golf Course Extension Road, Gurugram"));var specs=el("dl","ff-inventory-specs");[["Layout",x.bhk],["Area",x.size],["Floor",x.floor]].forEach(function(pair){var tile=el("div");tile.append(el("dt","",pair[0]),el("dd","",pair[1]||"On request"));specs.append(tile)});body.append(specs,el("p","ff-inventory-price",x.price||"Price on request"));var action=el(demo?"span":"a","ff-inventory-details",demo?"Demo only · No property page":"View Details");if(!demo)action.href=validPath(x.detailUrl);body.append(action);art.append(photo,body);return art;}
function draw(root,items,samples,renting){
  if(!root)return;
  var type=renting?"lease":"sale";
  var status=document.getElementById("ff-"+type+"-availability");
  if(status)status.hidden=items.length>0;
  // Samples never restore inventory links; only verified records can do that.
  document.querySelectorAll('[data-ff-inventory-type="'+type+'"]').forEach(function(link){
    if(!items.length)return;
    link.href=link.getAttribute("data-inventory-href");
    link.textContent=link.getAttribute("data-inventory-label");
    link.classList.remove("ff-availability-enquiry");
  });
  (items.length?items:samples).forEach(function(x){root.append(card(x,!items.length,renting));});
}
draw(saleRoot,verified,demos,false);
var leaseVerified=(Array.isArray(window.FF_LISTINGS)?window.FF_LISTINGS:[]).filter(function(x){return x&&String(x.project).trim().toLowerCase()==="mahindra luminare"&&String(x.status).toLowerCase()==="verified"&&String(x.availability).toLowerCase()==="available"&&String(x.type).toLowerCase()==="lease"&&validPath(x.detailUrl);});
var leaseDemos=local&&!leaseVerified.length?[
{bhk:"3BHK + 3T + SQ",size:"3008 Sq. Ft.",floor:"Higher Floor",price:"Rent on Request",image:"/projects/mahindra-luminare/images/med-mu7bwls7-g128g-desktop.webp"},
{bhk:"3BHK + 3T",size:"2980 Sq. Ft.",floor:"Middle Floor",price:"Rent on Request",image:"/projects/mahindra-luminare/images/med-mu7bwm4a-pur2p-desktop.webp"},
{bhk:"4BHK + 4T + SQ",size:"4200 Sq. Ft.",floor:"Higher Floor",price:"Rent on Request",image:"/projects/mahindra-luminare/images/med-mu7bwmm4-8w8mx-desktop.webp"}]:[];
draw(leaseRoot,leaseVerified,leaseDemos,true);
})();