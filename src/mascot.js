// Decorative feedback only: pause all frame work when the island is closed.
function createMascot(button, {storage=localStorage,motion=matchMedia('(prefers-reduced-motion: reduce)')}={}) {
  const sprite=button.querySelector('span');
  let open=false, busy=false, enabled=true, timer, frame=0, row=0;
  try{enabled=storage.getItem('soul-mascot-paused')!=='true';}catch{}
  function paint(){sprite.style.backgroundPosition=`${frame*20}% ${row*100/3}%`;button.dataset.frame=String(frame);}
  function stop(){clearTimeout(timer);timer=null;}
  function play(state='idle'){
    stop();frame=0;
    state=!enabled||!open?'sleeping':busy?'thinking':state;
    row={idle:0,curious:1,thinking:2,sleeping:3}[state];button.dataset.state=state;
    button.setAttribute('aria-pressed',String(!enabled));
    button.setAttribute('aria-label',enabled?'Pause flame mascot':'Wake flame mascot');
    button.title=enabled?'Pause flame mascot':'Wake flame mascot';paint();
    if(!open||!enabled||motion.matches)return;
    function tick(){
      frame++;if(frame===6){frame=0;if(state==='curious'){play();return;}if(state==='idle'){paint();timer=setTimeout(tick,7000);return;}}
      paint();timer=setTimeout(tick,state==='thinking'?180:220);
    }
    timer=setTimeout(tick,220);
  }
  button.onclick=()=>{enabled=!enabled;try{storage.setItem('soul-mascot-paused',String(!enabled));}catch{}play();};
  motion.addEventListener('change',()=>play());
  play();
  return {setOpen(value){if(open===value)return;open=value;play();},setBusy(value){busy=value;play();},curious(){if(open&&enabled)play('curious');}};
}
if(typeof module!=='undefined')module.exports={createMascot};
