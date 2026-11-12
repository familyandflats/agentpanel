/* FAQ accordion for IREO Victory Valley. Keeps article > h3 + p markup (read by the schema generator). */
(function(){function init(){var box=document.querySelector('#faq .vv-faq');if(!box)return;box.classList.add('is-acc');
box.querySelectorAll('article').forEach(function(a,i){var h=a.querySelector('h3'),p=a.querySelector('p');if(!h||!p||h.querySelector('button'))return;
var id='vvfaq-'+i;p.id=id;var b=document.createElement('button');b.type='button';b.setAttribute('aria-controls',id);b.textContent=h.textContent;h.textContent='';h.appendChild(b);
function set(o){a.classList.toggle('open',o);b.setAttribute('aria-expanded',o?'true':'false')}set(i===0);
b.addEventListener('click',function(){set(!a.classList.contains('open'))});});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();})();
