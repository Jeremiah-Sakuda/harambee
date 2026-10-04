import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
export class Store {
 constructor(path){this.path=path;}
 load(){if(!existsSync(this.path))return null;return JSON.parse(readFileSync(this.path,'utf8'));}
 save(value){mkdirSync(dirname(this.path),{recursive:true});writeFileSync(`${this.path}.tmp`,JSON.stringify(value,null,2),{mode:0o600});renameSync(`${this.path}.tmp`,this.path);}
}
