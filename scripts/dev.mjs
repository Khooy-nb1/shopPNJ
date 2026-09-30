import {spawn} from 'node:child_process';
const children=[spawn(process.execPath,['server/index.js'],{stdio:'inherit'}),spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','0.0.0.0','--port','3000'],{stdio:'inherit'})];
let closing=false;const close=(code=0)=>{if(closing)return;closing=true;for(const p of children)p.kill();process.exit(code);};for(const p of children)p.on('exit',code=>close(code||0));process.on('SIGINT',()=>close());process.on('SIGTERM',()=>close());
