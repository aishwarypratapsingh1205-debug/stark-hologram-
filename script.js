import { FilesetResolver, HandLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/+esm";

const video=document.querySelector("#video"), canvas=document.querySelector("#overlay"), ctx=canvas.getContext("2d");
const output=document.querySelector("#output"), start=document.querySelector("#start"), stop=document.querySelector("#stop");
const clear=document.querySelector("#clear"), status=document.querySelector("#status"), gestureEl=document.querySelector("#gesture"), keyboard=document.querySelector("#keyboard");

const rows=[
 ["1","2","3","4","5","6","7","8","9","0","-","=","BACKSPACE"],
 ["Q","W","E","R","T","Y","U","I","O","P","[","]","\\"],
 ["A","S","D","F","G","H","J","K","L",";","'","ENTER"],
 ["Z","X","C","V","B","N","M",",",".","/"],
 ["SPACE"]
];
const keys=[];
rows.forEach((r,i)=>{
 const row=document.createElement("div"); row.className="row";
 r.forEach(label=>{
   const b=document.createElement("button"); b.className="key";
   b.textContent=label;
   if(label==="SPACE") b.classList.add("space");
   if(label==="BACKSPACE") b.classList.add("wide");
   if(label==="ENTER") b.classList.add("enter");
   b.dataset.key=label; row.appendChild(b); keys.push(b);
   b.addEventListener("click",()=>pressKey(label,b));
 });
 keyboard.appendChild(row);
});

function pressKey(k,b){
 b?.classList.add("pressed"); setTimeout(()=>b?.classList.remove("pressed"),160);
 if(k==="BACKSPACE") output.value=output.value.slice(0,-1);
 else if(k==="ENTER") output.value+="\n";
 else if(k==="SPACE") output.value+=" ";
 else output.value+=k;
 output.focus();
}
document.addEventListener("keydown",e=>{
 const k=e.key.toUpperCase();
 if(e.key==="Backspace") pressKey("BACKSPACE");
 else if(e.key==="Enter") pressKey("ENTER");
 else if(e.key===" ") pressKey("SPACE");
 else if(keys.some(x=>x.dataset.key===k)) pressKey(k);
});
clear.onclick=()=>output.value="";

let stream=null, landmarker=null, running=false, lastVideoTime=-1, lastHover=null, pinchDown=false;

async function setup(){
 const vision=await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm");
 landmarker=await HandLandmarker.createFromOptions(vision,{
   baseOptions:{modelAssetPath:"https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",delegate:"GPU"},
   runningMode:"VIDEO",numHands:1,minHandDetectionConfidence:.55,minHandPresenceConfidence:.55,minTrackingConfidence:.55
 });
}
async function startCamera(){
 try{
   if(!landmarker) await setup();
   stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:1280},height:{ideal:720},facingMode:"user"},audio:false});
   video.srcObject=stream; await video.play(); running=true;
   status.textContent="● CAMERA ONLINE";status.className="status online";start.disabled=true;stop.disabled=false;
   requestAnimationFrame(loop);
 }catch(e){alert("Camera start failed. Use HTTPS or localhost and allow camera permission.");console.error(e)}
}
function stopCamera(){
 running=false;if(stream) stream.getTracks().forEach(t=>t.stop());video.srcObject=null;
 status.textContent="● CAMERA OFF";status.className="status offline";start.disabled=false;stop.disabled=true;
 ctx.clearRect(0,0,canvas.width,canvas.height);gestureEl.textContent="Camera off";
}
start.onclick=startCamera;stop.onclick=stopCamera;

function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function loop(){
 if(!running)return;
 if(video.readyState>=2 && video.currentTime!==lastVideoTime){
   lastVideoTime=video.currentTime;
   canvas.width=video.videoWidth;canvas.height=video.videoHeight;
   const result=landmarker.detectForVideo(video,performance.now());
   draw(result);
 }
 requestAnimationFrame(loop);
}
function draw(result){
 ctx.clearRect(0,0,canvas.width,canvas.height);
 if(!result.landmarks?.length){gestureEl.textContent="NO HAND";clearHover();return}
 const lm=result.landmarks[0];
 // Draw a simple neon skeleton.
 ctx.lineWidth=3;ctx.strokeStyle="#00eaff";ctx.shadowBlur=12;ctx.shadowColor="#00eaff";
 const chains=[[0,1,2,3,4],[0,5,6,7,8],[0,9,10,11,12],[0,13,14,15,16],[0,17,18,19,20],[5,9,13,17]];
 for(const chain of chains){ctx.beginPath();chain.forEach((i,j)=>{const p=lm[i];j?ctx.lineTo(p.x*canvas.width,p.y*canvas.height):ctx.moveTo(p.x*canvas.width,p.y*canvas.height)});ctx.stroke()}
 lm.forEach(p=>{ctx.beginPath();ctx.arc(p.x*canvas.width,p.y*canvas.height,5,0,Math.PI*2);ctx.fillStyle="#bfffff";ctx.fill()});
 const index=lm[8], thumb=lm[4];
 // Camera image is mirrored; x is intentionally mirrored to match visible video.
 const x=(1-index.x)*canvas.width, y=index.y*canvas.height;
 const hover=document.elementFromPoint(0,0); // not used; map to keyboard bounding boxes below
 const pinch=dist(index,thumb)<.055;
 gestureEl.textContent=pinch?"PINCH → PRESS":"INDEX → SELECT";
 const key=findKeyAtScreen(x/canvas.width,y/canvas.height);
 setHover(key);
 if(pinch && !pinchDown && key){pressKey(key.dataset.key,key);pinchDown=true}
 if(!pinch)pinchDown=false;
}
function findKeyAtScreen(nx,ny){
 // The camera view occupies the left panel, so gesture selection is mapped
 // across the keyboard by normalized coordinates. Use the lower ~60% of the
 // camera as the keyboard interaction plane.
 if(ny<.30) return null;
 const col=Math.min(1,Math.max(0,nx));
 const rowN=Math.min(rows.length-1,Math.floor((ny-.30)/.14));
 const row=keyboard.querySelectorAll(".row")[rowN];
 if(!row)return null;
 const candidates=[...row.children];
 return candidates[Math.min(candidates.length-1,Math.floor(col*candidates.length))]||null;
}
function setHover(key){
 if(lastHover===key)return;
 if(lastHover)lastHover.classList.remove("hover");
 lastHover=key;if(lastHover)lastHover.classList.add("hover");
}
function clearHover(){if(lastHover)lastHover.classList.remove("hover");lastHover=null}
