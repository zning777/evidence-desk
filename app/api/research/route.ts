import { env } from 'cloudflare:workers';
import data from '@/lib/research-data.json';
import { renderSelection, choiceCatalog, selectorPrompt } from '@/lib/contract.mjs';

const cache = new Map<string, {expires:number; payload:Record<string,unknown>}>();
const attempts = new Map<string, {start:number; count:number}>();
const json = (body:unknown, status=200) => Response.json(body, {status, headers:{'Cache-Control':'no-store'}});

export async function POST(request:Request) {
  // Public read access; paid model requests require the server-side access code.
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return json({status:'request_rejected', message:'不接受跨站调用。'},403);
  const runtime = env as unknown as Record<string,string|undefined>;
  if(!runtime.DEMO_ACCESS_CODE)return json({status:'not_configured',message:'AI 演示访问口令尚未配置，公开证据仍可查阅。'},503);
  if(request.headers.get('X-Demo-Access-Code')!==runtime.DEMO_ACCESS_CODE)return json({status:'unauthorized',message:'AI 访问口令错误或缺失，请核对后重试。'},401);
  if (Number(request.headers.get('content-length') || 0) > 2048) return json({status:'invalid_input',message:'问题过长。'},413);
  let question:string;
  try { const body = await request.json() as {question?:unknown};
    if (typeof body.question !== 'string' || !body.question.trim() || body.question.length > 200) return json({status:'invalid_input',message:'请输入 1–200 字的研究问题。'},400);
    question = body.question.trim();
  } catch { return json({status:'invalid_input',message:'请求格式错误。'},400); }
  const cached = cache.get(question);
  if (cached && cached.expires > Date.now()) return json({...cached.payload, cached:true});
  const key = runtime.DEEPSEEK_API_KEY;
  if (!key) return json({status:'not_configured', message:'模型服务尚未配置。仍可查看已核验的示例证据；不会伪装成 AI 生成。'},503);
  // Per-isolate demo guard, not a distributed production quota.
  const who = request.headers.get('oai-authenticated-user-id') || request.headers.get('cf-connecting-ip') || 'local';
  const quota = attempts.get(who);
  if (quota && Date.now()-quota.start < 60000 && quota.count >= 6) return json({status:'rate_limited',message:'调用较频繁，请稍后重试。'},429);
  attempts.set(who, quota && Date.now()-quota.start < 60000 ? {...quota,count:quota.count+1} : {start:Date.now(),count:1});
  if (attempts.size > 500) attempts.delete(attempts.keys().next().value!);
  const started = Date.now();
  try {
    // Worker fetch supports manual/follow only. Reject all non-2xx, including redirects.
    const response = await fetch('https://api.deepseek.com/chat/completions', { method:'POST', redirect:'manual',
      headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'}, signal:AbortSignal.timeout(20000),
      body:JSON.stringify({model:'deepseek-flash',thinking:{type:'disabled'},max_tokens:400,stream:false,response_format:{type:'json_object'},
        messages:[{role:'system',content:selectorPrompt},{role:'user',content:JSON.stringify({question,catalog:choiceCatalog(data.catalog)})}]}) });
    if (!response.ok) return json({status:'model_error',message:response.status===429?'模型服务繁忙或额度受限。示例证据仍可查阅。':'模型服务暂不可用。未生成新的研究结果。'},502);
    const result = await response.json() as {id?:string;choices?:{finish_reason:string;message:{content:string}}[];usage?:{total_tokens:number}};
    const choice = result.choices?.[0];
    if (!choice || choice.finish_reason !== 'stop') return json({status:'invalid_selection',message:'模型输出不完整，已阻止展示。'},502);
    let selection;
    try { selection=JSON.parse(choice.message.content); } catch { return json({status:'invalid_selection',message:'模型格式校验失败，已阻止展示。'},502); }
    const view = renderSelection(selection,data.catalog);
    const payload = {...view, provenance:{model:'deepseek-flash',request_id:result.id,elapsed_ms:Date.now()-started,total_tokens:result.usage?.total_tokens,
      baseline_version:data.baseline_version,generated_at:new Date().toISOString()},cached:false};
    if (view.status==='ready') {
      if(cache.size>=100) cache.delete(cache.keys().next().value!);
      cache.set(question,{expires:Date.now()+300000,payload});
    }
    return json(payload);
  } catch (error) {
    // Names only: never log credentials, request bodies, headers or raw provider errors.
    console.warn('research_upstream_failure', error instanceof Error ? error.name : 'UnknownError');
    return json({status:'model_error',message:'模型调用超时或网络异常。保留当前示例，但不将其标记为本次 AI 回答。'},502);
  }
}
