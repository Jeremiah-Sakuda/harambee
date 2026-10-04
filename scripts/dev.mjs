import { spawn } from 'node:child_process';
const jobs = [spawn(process.execPath, ['server/index.mjs'], {stdio:'inherit'}), spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5171'], {stdio:'inherit'})];
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => {jobs.forEach(p => p.kill(signal)); process.exit();});
for (const job of jobs) job.on('exit', code => { if(code) { jobs.forEach(p => p.kill()); process.exit(code); }});
