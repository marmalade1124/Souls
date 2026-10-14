// Decorative feedback only: pause all frame work when the island is closed.
function createMascot(button, {storage=localStorage,motion=matchMedia('(prefers-reduced-motion: reduce)')}={}) {
  const sprite=button.querySelector('span');
  const layers=[...sprite.querySelectorAll('i')];
  let open=false, busy=false, enabled=true, timer, frame=0, row=0, front=0, animations=[],breathing;
  try{enabled=storage.getItem('soul-mascot-paused')!=='true';}catch{}
  function paint(blend=false){
    animations.forEach(animation=>animation.cancel());animations=[];
    const previous=layers[front];front=1-front;const next=layers[front];
    next.style.backgroundPosition=`${frame*20}% ${row*100/3}%`;next.style.opacity='1';previous.style.opacity='0';
    if(blend){animations=[next.animate([{opacity:0},{opacity:1}],{duration:180,easing:'linear'}),previous.animate([{opacity:1},{opacity:0}],{duration:180,easing:'linear'})];}
    button.dataset.frame=String(frame);
  }
  function stop(){clearTimeout(timer);timer=null;animations.forEach(animation=>animation.cancel());animations=[];breathing?.cancel();breathing=null;}
  function play(state='idle'){
    stop();frame=0;
    state=!enabled||!open?'sleeping':busy?'thinking':state;
    row={idle:0,curious:1,thinking:2,sleeping:3}[state];button.dataset.state=state;
    button.setAttribute('aria-pressed',String(!enabled));
    button.setAttribute('aria-label',enabled?'Pause flame mascot':'Wake flame mascot');
    button.title=enabled?'Pause flame mascot':'Wake flame mascot';paint(open&&enabled&&!motion.matches);
    if(!open||!enabled||motion.matches)return;
    breathing=sprite.animate([{transform:'translateY(0) scale(1)'},{transform:'translateY(-1px) scale(1.025)'},{transform:'translateY(0) scale(1)'}],{duration:state==='thinking'?1080:1320,easing:'cubic-bezier(.77,0,.175,1)',iterations:state==='thinking'?Infinity:1});
    function tick(){
      frame++;if(frame===6){frame=0;if(state==='curious'){play();return;}if(state==='idle'){paint(true);timer=setTimeout(()=>play(),7000);return;}}
      paint(true);timer=setTimeout(tick,state==='thinking'?180:220);
    }
    timer=setTimeout(tick,220);
  }
  button.onclick=()=>{enabled=!enabled;try{storage.setItem('soul-mascot-paused',String(!enabled));}catch{}play();};
  motion.addEventListener('change',()=>play());
  play();
  return {setOpen(value){if(open===value)return;open=value;play();},setBusy(value){busy=value;play();},curious(){if(open&&enabled)play('curious');}};
}
if(typeof module!=='undefined')module.exports={createMascot};
