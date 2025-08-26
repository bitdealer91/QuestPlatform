export function dotGet(obj:any, path:string){
  return path.split('.').reduce((o,k)=> (o ? o[k] : undefined), obj);
}










