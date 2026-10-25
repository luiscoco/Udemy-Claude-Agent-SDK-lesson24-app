// A controlled teaching delay, not a production startup requirement.
import {spawn} from "node:child_process";
const [server,directory,delayText]=process.argv.slice(2);
const delayMs=Number(delayText);
if(!server || !directory || delayMs!==2000)throw new Error("Use the classroom startup configuration.");
let child;
const timer=setTimeout(()=>{
 child=spawn(process.execPath,[server,directory],{stdio:["pipe","pipe","inherit"],windowsHide:true});
 process.stdin.pipe(child.stdin);child.stdout.pipe(process.stdout);
 child.on("error",()=>process.exit(1));child.on("exit",code=>process.exit(code || 0));
},delayMs);
for(const signal of ["SIGINT","SIGTERM"])process.on(signal,()=>{clearTimeout(timer);child?.kill();process.exit(0);});
