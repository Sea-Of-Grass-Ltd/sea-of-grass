/* Sea of Grass shop: product cards, a cart button in the header and a cart drawer.
   Needs checkout-links.js first. The cart is kept in localStorage ('sog-cart'), so it survives reloads.
   Cards:  <div class="shop-cards" data-shop-cards="fix,care,kickoff"></div>
   Button: any element with data-add="fix" adds that product. */
(function(){
'use strict';
var S=window.SOG_SHOP;if(!S)return;
var KEY='sog-cart',P=S.products;
var $=function(s,r){return (r||document).querySelector(s);};
var money=function(n){return '$'+n.toLocaleString('en-US',{minimumFractionDigits:n%1?2:0,maximumFractionDigits:2});};
var esc=function(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});};

/* ---- the cart: {id: qty} ---- */
function read(){try{var c=JSON.parse(localStorage.getItem(KEY)||'{}');var o={};for(var k in c)if(P[k]&&c[k]>0)o[k]=Math.min(P[k].maxQty||1,Math.floor(c[k]));return o;}catch(e){return {};}}
var cart=read();
function save(){try{localStorage.setItem(KEY,JSON.stringify(cart));}catch(e){}render();}
function count(){var n=0;for(var k in cart)n+=cart[k];return n;}
function add(id){if(!P[id])return;cart[id]=Math.min(P[id].maxQty||1,(cart[id]||0)+1);save();btn.classList.remove('bump');void btn.offsetWidth;btn.classList.add('bump');}
function setQty(id,q){if(q<=0)delete cart[id];else cart[id]=Math.min(P[id].maxQty||1,q);save();}
function terms(){var s='',open=false;for(var k in cart){var p=P[k];if(p.interval!=='month')continue;if(p.term)s+=' '+p.name+': '+p.term+' payments of '+money(p.price)+' ('+money(p.price*p.term)+' total), then it ends.';else open=true;}return s+(open?' Care: cancel any month.':'');}
function totals(){var once=0,month=0;for(var k in cart){var p=P[k],t=p.price*cart[k];if(p.interval==='month')month+=t;else once+=t;}return {today:once+month,once:once,month:month};}
function linkKey(){return Object.keys(cart).sort().join('+');}
addEventListener('storage',function(e){if(e.key===KEY){cart=read();render();}});

/* ---- product cards, from the config ---- */
function priceHTML(p){return '<span class="shop-pr">'+(p.from?'<small>From</small> ':'')+money(p.price)+(p.interval?'<small>/'+(p.interval==='month'?'mo':p.interval)+'</small>':'')+'</span>';}
document.querySelectorAll('[data-shop-cards]').forEach(function(box){
  var pick=box.dataset.shopPick||'',badge=box.dataset.shopBadge||'Recommended';   // data-shop-pick="care" marks one card as the recommended one
  box.innerHTML=box.dataset.shopCards.split(',').map(function(id){id=id.trim();var p=P[id];if(!p)return '';
    return '<article class="shop-card'+(id===pick?' pick':'')+'" data-id="'+id+'">'+(id===pick?'<span class="shop-badge">'+esc(badge)+'</span>':'')+'<h3>'+esc(p.name)+'</h3>'+priceHTML(p)+
      (p.interval?'<p class="shop-sub">Billed monthly'+(p.term?', '+p.term+'-month minimum ('+money(p.price*p.term)+' total)':'')+'</p>':'<p class="shop-sub">Paid once</p>')+
      '<p class="shop-blurb">'+esc(p.blurb)+'</p><ul>'+p.lines.map(function(l){return '<li>'+esc(l)+'</li>';}).join('')+'</ul>'+
      '<button type="button" class="shop-add" data-add="'+id+'">Add to cart</button></article>';}).join('');
});

/* ---- header button + drawer ---- */
var nav=$('header.top nav')||$('header nav');
var btn=document.createElement('button');btn.type='button';btn.className='shop-cartbtn';btn.setAttribute('aria-haspopup','dialog');btn.setAttribute('aria-controls','shop-drawer');
btn.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9L5 7Z"/><path d="M9 10V6a3 3 0 0 1 6 0v4"/></svg><span class="shop-cartlbl">Cart</span><span class="shop-n" aria-hidden="true"></span>';
if(nav){var book=nav.querySelector('.book');nav.insertBefore(btn,book||null);}else{btn.classList.add('shop-float');document.body.appendChild(btn);}

var veil=document.createElement('div');veil.className='shop-veil';veil.hidden=true;
var dr=document.createElement('aside');dr.className='shop-drawer';dr.id='shop-drawer';dr.hidden=true;
dr.setAttribute('role','dialog');dr.setAttribute('aria-modal','true');dr.setAttribute('aria-labelledby','shop-h');
dr.innerHTML='<div class="shop-head"><h2 id="shop-h">Your cart</h2><button type="button" class="shop-x" aria-label="Close cart">&times;</button></div>'+
  '<div class="shop-body"></div><div class="shop-foot"></div>';
var live=document.createElement('p');live.className='shop-live';live.setAttribute('role','status');live.setAttribute('aria-live','polite');
document.body.append(veil,dr,live);

function render(){
  var n=count();btn.querySelector('.shop-n').textContent=n||'';btn.classList.toggle('has',n>0);
  btn.setAttribute('aria-label',n?'Cart, '+n+(n===1?' item':' items'):'Cart, empty');
  document.querySelectorAll('.shop-add').forEach(function(b){var id=b.dataset.add,q=cart[id]||0,full=q>=(P[id].maxQty||1);
    b.textContent=q?(full?'In your cart ✓':'Add another'):'Add to cart';b.classList.toggle('in',q>0);b.disabled=full;});
  var body=$('.shop-body',dr),foot=$('.shop-foot',dr),ids=Object.keys(cart);
  if(!ids.length){body.innerHTML='<div class="shop-empty"><p>Nothing in here yet.</p><p class="shop-muted">Fixes, care plans and kickoffs can be bought outright, no call first.</p><a class="shop-link" href="/preview/services/websites/#buy">See what you can buy &rarr;</a></div>';foot.innerHTML='';return;}
  body.innerHTML='<ul class="shop-items">'+ids.map(function(id){var p=P[id],q=cart[id],max=p.maxQty||1;
    return '<li data-id="'+id+'"><div class="shop-it"><b>'+esc(p.name)+'</b><span class="shop-muted">'+(p.from?'From ':'')+money(p.price)+(p.interval?' a month, billed monthly'+(p.term?', '+p.term+'-month minimum ('+money(p.price*p.term)+' total)':''):(max>1?' each':'')+', paid once')+'</span></div>'+
      '<div class="shop-ctl">'+(max>1?'<div class="shop-qty" role="group" aria-label="Quantity of '+esc(p.name)+'"><button type="button" data-q="-1" aria-label="One fewer">−</button><output aria-live="polite">'+q+'</output><button type="button" data-q="1" aria-label="One more"'+(q>=max?' disabled':'')+'>+</button></div>':'<span class="shop-muted">Qty 1</span>')+
      '<button type="button" class="shop-rm" data-rm aria-label="Remove '+esc(p.name)+'">Remove</button></div><span class="shop-line">'+money(p.price*q)+(p.interval?'<small>/mo</small>':'')+'</span></li>';}).join('')+'</ul>';
  var t=totals();
  foot.innerHTML='<dl class="shop-sum">'+(t.once&&t.month?'<div><dt>Paid once</dt><dd>'+money(t.once)+'</dd></div>':'')+(t.month?'<div><dt>Monthly</dt><dd>'+money(t.month)+'<small>/mo</small></dd></div>':'')+
    '<div class="shop-total"><dt>Due today</dt><dd>'+money(t.today)+'</dd></div></dl>'+
    (t.month?'<p class="shop-muted">Then '+money(t.month)+' billed monthly.'+terms()+'</p>':'')+
    (cart.fix?'<p class="shop-muted">Fixes are priced from '+money(P.fix.price)+'; if yours is bigger, we tell you before any work.</p>':'')+
    '<button type="button" class="shop-go">Checkout &rarr;</button><p class="shop-muted shop-demo">'+(S.mode==='live'?'Secure checkout by Stripe.':'Demo: checkout is a stand-in page. No payment is taken.')+'</p>';
}

dr.addEventListener('click',function(e){var li=e.target.closest('li[data-id]');
  if(e.target.closest('.shop-x'))return close();
  if(e.target.closest('.shop-go'))return checkout();
  if(!li)return;var id=li.dataset.id;
  if(e.target.closest('[data-rm]')){setQty(id,0);say(P[id].name+' removed');focusIn();return;}
  var q=e.target.closest('[data-q]');if(q){var was=document.activeElement===q?q.dataset.q:null;setQty(id,(cart[id]||0)+(+q.dataset.q));
    if(cart[id]){say(P[id].name+': '+cart[id]);if(was){var nb=dr.querySelector('li[data-id="'+id+'"] [data-q="'+was+'"]');(nb&&!nb.disabled?nb:dr.querySelector('li[data-id="'+id+'"] [data-q]')).focus();}}else{say(P[id].name+' removed');focusIn();}}});

document.addEventListener('click',function(e){var a=e.target.closest('[data-add]');if(!a||a.disabled)return;var id=a.dataset.add;add(id);say(P[id].name+' added to your cart');open(a);});

/* ---- open / close, with the focus kept inside ---- */
var opener=null;
function open(from){opener=from||document.activeElement;render();veil.hidden=dr.hidden=false;document.documentElement.classList.add('shop-open');
  requestAnimationFrame(function(){dr.classList.add('on');veil.classList.add('on');});focusIn();}
function close(){dr.classList.remove('on');veil.classList.remove('on');document.documentElement.classList.remove('shop-open');
  setTimeout(function(){dr.hidden=veil.hidden=true;},260);if(opener&&opener.focus)opener.focus();}
function focusIn(){setTimeout(function(){dr.querySelector('.shop-x').focus();},30);}
btn.addEventListener('click',function(){open(btn);});
veil.addEventListener('click',close);
dr.addEventListener('keydown',function(e){if(e.key==='Escape'){e.preventDefault();close();return;}
  if(e.key!=='Tab')return;var f=[].slice.call(dr.querySelectorAll('button:not([disabled]),a[href]'));if(!f.length)return;
  if(e.shiftKey&&document.activeElement===f[0]){e.preventDefault();f[f.length-1].focus();}else if(!e.shiftKey&&document.activeElement===f[f.length-1]){e.preventDefault();f[0].focus();}});
function say(t){live.textContent='';setTimeout(function(){live.textContent=t;},40);}

/* ---- checkout: the demo page now, a Stripe Payment Link later ---- */
function checkout(){if(!count())return;
  if(S.mode==='live'){var u=S.links[linkKey()];if(u&&u.indexOf('PLACEHOLDER')<0){location.href=u;return;}}
  location.href=S.demoCheckout;}

window.sogCart={get:function(){return JSON.parse(JSON.stringify(cart));},clear:function(){cart={};save();},totals:totals,linkKey:linkKey,open:open};
render();
if(location.hash==='#cart')open(btn);
})();
