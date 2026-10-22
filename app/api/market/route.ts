import {env} from 'cloudflare:workers';
import {validateSnapshot,validateValuations,computeTrend} from '@/lib/market.mjs';
import type {MarketView} from '@/lib/market-types';
let cached:{expires:number;value:MarketView}|null=null;
let inFlight:Promise<MarketView>|null=null;
const response=(value:MarketView)=>Response.json(value,{headers:{'Cache-Control':'no-store'}});
async function collect(key:string):Promise<MarketView>{
 const fetched_at=new Date().toISOString(),sources:NonNullable<MarketView['sources']>=[],errors:Record<string,string>={};
 const start=Date.parse('2026-05-01T00:00:00+08:00'),end=Date.parse('2026-10-21T23:59:59+08:00');
 async function get(name:string,path:string){let failure='数据接口失败或未返回可用字段';for(let attempt=0;attempt<2;attempt++){try{const res=await fetch('https://fuyao.aicubes.cn'+path,{headers:{'X-api-key':key,Accept:'application/json'},redirect:'manual',signal:AbortSignal.timeout(8000)});if(!res.ok){failure=`供应商 HTTP ${res.status}`;if(res.status===429||res.status>=500)throw Error('retryable_provider_error');break;}const body=await res.json() as {code:number;request_id?:string;data:Record<string,unknown>};if(body.code!==0||!body.data){failure='供应商业务状态异常或缺少数据';break;}sources.push({name,request_id:body.request_id,timestamp:typeof body.data.timestamp==='number'?body.data.timestamp:undefined,retrieved_at:new Date().toISOString()});return body.data;}catch{if(attempt===0)await new Promise(resolve=>setTimeout(resolve,600));}}errors[name]=failure+'；未生成这一维度的判断';return null;}
 const [prices,valuations]=await Promise.all([
  get('snapshot','/api/a-share/prices/snapshot?thscodes=000333.SZ'),
  get('valuations','/api/a-share/valuations/snapshot?thscodes=000333.SZ%2C600690.SH%2C000651.SZ')]);
 const [stock,index]=await Promise.all([
  get('stock_history',`/api/a-share/prices/historical?thscode=000333.SZ&interval=1d&start=${start}&end=${end}&adjust=forward`),
  get('index_history',`/api/a-share-index/prices/historical?thscode=000300.SH&interval=1d&start=${start}&end=${end}`)]);
 const value:MarketView={status:'partial',fetched_at,sources,errors};
 try{if(prices)value.snapshot=validateSnapshot(prices);}catch{errors.snapshot='行情时间过期/异常、字段缺失或涨跌口径冲突，已停止展示行情数值';}
 try{if(valuations)value.valuations=validateValuations(valuations);}catch{errors.valuations='估值时间过期/异常或字段缺失，已停止展示估值对比';}
 try{if(stock&&index)value.trend=computeTrend(stock,index);}catch{errors.trend='未到固定研究截止日、共同交易日不足、数据异常或复权口径不符，已停止计算区间指标';}
 value.status=value.snapshot&&value.valuations&&value.trend?'ready':'partial';return value;
}
export async function GET(){
 if(cached&&cached.expires>Date.now())return response({...cached.value,cached:true});
 const key=(env as unknown as Record<string,string|undefined>).FUYAO_API_KEY;
 if(!key)return response({status:'not_configured',message:'行情与估值接口尚未配置；财报证据仍可研究，未将缺失数据补零。'});
 if(!inFlight)inFlight=collect(key).then(value=>{cached={expires:Date.now()+(value.status==='ready'?300000:30000),value};return value;}).finally(()=>{inFlight=null;});
 return response(await inFlight);
}
