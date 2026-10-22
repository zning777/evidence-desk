'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowUpRight,ArrowRight,BookOpen,Bookmark,CheckCheck,ChevronRight,CircleHelp,Clock3,ExternalLink,FileText,Layers3,LoaderCircle,PanelLeft,Search,ShieldCheck,Sparkles,Target,TrendingDown,TrendingUp,X} from 'lucide-react';
import data from '@/lib/research-data.json';
import {presetSelection,renderSelection} from '@/lib/contract.mjs';
import {parseSavedResearch,profitBridgeRows,formatYi} from '@/lib/ui-utils.mjs';
import type {Fact,Research,Question,Group,Relation} from '@/lib/types';
import MarketContext,{marketTime} from '@/components/market-context';
import type {MarketView} from '@/lib/market-types';

const catalog=data.catalog;
const examples=[{intent:'profit_reconciliation',label:'利润为何分歧？',question:'美的归母利润增长，为什么扣非归母利润却下降？'},
  {intent:'cash_quality',label:'现金支持可靠吗？',question:'美的经营现金流能否支持盈利质量？'},
  {intent:'operating_margin',label:'收入增长有质量吗？',question:'美的收入增长，毛利率和毛利金额有什么变化？'}];
const groups:{key:Group|'unknown';name:string;note:string;icon:typeof TrendingUp}[]=[
  {key:'positive',name:'正面证据',note:'支持当前命题',icon:TrendingUp},{key:'negative',name:'负面证据',note:'提示压力与反证',icon:TrendingDown},
  {key:'mixed',name:'交叉 / 分歧',note:'口径与表现需拆开',icon:Layers3},{key:'unknown',name:'待验证',note:'当前证据不能回答',icon:CircleHelp}];
const labels:Record<string,string>={operating_income:'营业收入',operating_costs:'营业成本',parent_holder_net_profit:'归母净利润',deducted_parent_net_profit:'扣非归母净利润',net_profit:'合并净利润',minority_profit:'少数股东损益',act_cash_flow_net:'经营现金流净额',fx_profit_loss_pretax:'汇兑损益（税前）',derivative_fair_value_profit_loss_pretax:'衍生工具公允价值损益（税前）',derivative_disposal_profit_loss_pretax:'处置衍生工具损益（税前）',equity_fair_value_profit_loss_pretax:'权益工具公允价值损益（税前）',operating_receivables_increase_cash_outflow:'经营性应收增加占用',operating_payables_increase_cash_inflow:'经营性应付增加支持'};
const titles:Record<string,string>={profit_reconciliation:'利润在增长，还是口径在变化？',cash_quality:'现金流为利润提供了多少支持？',operating_margin:'规模扩大，毛利空间是否改善？'};
type Provenance={model:string;request_id?:string;elapsed_ms:number;total_tokens?:number;generated_at:string;baseline_version:string};
type Saved={question:string;intent:string;time:string};
function preset(intent:string):Research{return renderSelection(presetSelection(intent,catalog),catalog) as Research;}

export default function ResearchWorkbench(){
 const [question,setQuestion]=useState(examples[0].question),[activeQuestion,setActiveQuestion]=useState(examples[0].question);
 const [view,setView]=useState<Research>(()=>preset('profit_reconciliation')),[filter,setFilter]=useState('all');
 const [drawer,setDrawer]=useState<{kind:'fact';fact:Fact}|{kind:'relation';relation:Relation}|{kind:'question';question:Question}|{kind:'sources'|'saved'|'about'}|null>(null);
 const [loading,setLoading]=useState(false),[message,setMessage]=useState(''),[provenance,setProvenance]=useState<Provenance|null>(null);
 const [cacheHit,setCacheHit]=useState(false),[saved,setSaved]=useState<Saved[]>([]),[notice,setNotice]=useState('');
 const [market,setMarket]=useState<MarketView|null>(null),[accessCode,setAccessCode]=useState('');
 const drawerRef=useRef<HTMLElement>(null),previousFocus=useRef<HTMLElement|null>(null);
 const drawerOpen=drawer!==null;
 useEffect(()=>{try{setSaved(parseSavedResearch(localStorage.getItem('suzheng-research-v1'),catalog.routes) as Saved[]);}catch{}},[]);
 useEffect(()=>{if(!notice)return;const id=setTimeout(()=>setNotice(''),3500);return()=>clearTimeout(id);},[notice]);
 useEffect(()=>{if(!drawerOpen)return;previousFocus.current=document.activeElement as HTMLElement;
   const old=document.body.style.overflow;document.body.style.overflow='hidden';
   const handle=(event:KeyboardEvent)=>{if(event.key==='Escape')setDrawer(null);if(event.key==='Tab'){
    const nodes=drawerRef.current?.querySelectorAll<HTMLElement>('button,a[href],input,[tabindex="0"]');if(!nodes?.length)return;
    const first=nodes[0],last=nodes[nodes.length-1];const outside=!drawerRef.current?.contains(document.activeElement)||document.activeElement===drawerRef.current;
    if(event.shiftKey&&(document.activeElement===first||outside)){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&(document.activeElement===last||outside)){event.preventDefault();first.focus();}}};
   document.addEventListener('keydown',handle);return()=>{document.body.style.overflow=old;document.removeEventListener('keydown',handle);if(previousFocus.current?.isConnected)previousFocus.current.focus({preventScroll:true});};},[drawerOpen]);
 useEffect(()=>{if(drawer){drawerRef.current?.scrollTo({top:0});drawerRef.current?.querySelector<HTMLElement>('button')?.focus({preventScroll:true});}},[drawer]);
 function chooseExample(intent:string){const example=examples.find(x=>x.intent===intent)!;setQuestion(example.question);setActiveQuestion(example.question);setView(preset(intent));setProvenance(null);setMessage('');setFilter('all');setCacheHit(false);}
 async function research(){if(loading||!question.trim()||!accessCode.trim())return;setLoading(true);setMessage('');
  try{const response=await fetch('/api/research',{method:'POST',headers:{'Content-Type':'application/json','X-Demo-Access-Code':accessCode},body:JSON.stringify({question})});const body=await response.json() as Research & {provenance:Provenance;cached?:boolean;message?:string};
   if(response.ok&&body.status==='ready'){setView(body);setActiveQuestion(question);setProvenance(body.provenance);setCacheHit(!!body.cached);setFilter('all');}
   else setMessage(body.message||body.reason||'回答未通过证据校验，未替换当前研究。');
  }catch{setMessage('网络连接失败，未生成本次回答。下方保留原研究，并非本次 AI 结果。');}finally{setLoading(false);}}
 function save(){const item={question:activeQuestion,intent:view.intent||'profit_reconciliation',time:new Date().toISOString()};const next=[item,...saved.filter(x=>x.question!==item.question)].slice(0,20);
  try{localStorage.setItem('suzheng-research-v1',JSON.stringify(next));setSaved(next);setNotice('已保存研究入口到本机浏览器');}catch{setNotice('浏览器存储不可用，未能保存');}}
 const counts=Object.fromEntries(groups.map(g=>[g.key,g.key==='unknown'?view.questions.length:view.facts.filter(f=>f.group===g.key).length]));
 const facts=view.facts.filter(f=>filter==='all'||f.group===filter);
 return <div className="workbench"><aside className="sidebar" inert={drawerOpen||undefined}>
  <a className="brand" href="/" aria-label="溯证首页"><span className="brand-mark"><Layers3 size={23}/></span><span>溯证<small>EVIDENCE DESK</small></span></a>
  <div className="workspace-label">个人研究空间 <span>原型</span></div>
  <nav aria-label="主导航"><button className="nav-item active" onClick={()=>{setDrawer(null);window.scrollTo({top:0,behavior:'smooth'});}}><PanelLeft size={18}/>研究工作台</button>
   <button className="nav-item" onClick={()=>setDrawer({kind:'saved'})}><Bookmark size={18}/>已存研究<span className="nav-count">{saved.length}</span></button>
   <button className="nav-item" onClick={()=>setDrawer({kind:'sources'})}><BookOpen size={18}/>数据与来源</button></nav>
  <div className="side-section"><span>当前研究标的</span><span className="side-dot"/></div>
  <div className="stock-side"><span className="stock-avatar">M</span><div><strong>美的集团</strong><small>000333.SZ · 深市主板</small></div></div>
  <div className="side-context"><Clock3 size={14}/><span>财务研究截面<br/><strong>2026 半年度</strong></span></div>
  <div className="side-bottom"><ShieldCheck size={19}/><p>让判断有据可循<small>不提供买卖建议或收益承诺</small></p><button onClick={()=>setDrawer({kind:'about'})} aria-label="产品边界说明"><CircleHelp size={17}/></button></div>
 </aside><div className="main-shell" inert={drawerOpen||undefined}>
  <header className="topbar"><div><span>研究空间</span><ChevronRight size={13}/><strong>个股诊断</strong></div><div className="top-actions"><span className="verified"><span/>公开财报已核验</span><button className="icon-button mobile-saved" aria-label="查看已存研究" onClick={()=>setDrawer({kind:'saved'})}><Bookmark size={17}/></button><button className="icon-button" aria-label="查看数据来源" onClick={()=>setDrawer({kind:'sources'})}><FileText size={17}/></button><span className="profile">研</span></div></header>
  <main><div className="page-kicker">从问题出发 · 沿证据研究</div>
   <div className="company-heading"><div className="company-title"><h1>美的集团</h1><span className="ticker">000333.SZ</span><span className="industry">家用电器</span></div><button className="button secondary" disabled={loading} onClick={save}><Bookmark size={15}/>保存研究</button></div>
   <div className="company-description">财务截面：2026H1 对 2025H1 <span>·</span> 合并累计半年 <span>·</span> 固定财报证据包</div>
   <div className="market-quote">{market?.snapshot?<><strong>行情快照 ¥{market.snapshot.price.toFixed(2)}</strong><span>{market.snapshot.change_pct>0?'+':''}{market.snapshot.change_pct.toFixed(2)}%</span><small>供应商时点 {marketTime(market.snapshot.timestamp)} · 非实时刷新</small></>:<small>行情快照：{market?.message||market?.errors?.snapshot||(market?'数据不可用':'正在加载')}；不补零或推断涨跌。</small>}</div>
   <section className="question-panel" aria-labelledby="question-label"><div className="question-label" id="question-label"><Sparkles size={16}/>你想了解这家公司的什么？<span>AI 辅助组织证据</span></div>
    <form onSubmit={e=>{e.preventDefault();void research();}} className="question-form"><Search size={20}/><input aria-label="研究问题" disabled={loading} maxLength={200} value={question} onChange={e=>setQuestion(e.target.value)} placeholder="例如：归母利润增长，为什么扣非利润下降？"/><button className="button primary" disabled={loading||!question.trim()||!accessCode.trim()} type="submit">{loading?<LoaderCircle className="spin" size={16}/>:<Sparkles size={16}/>} {loading?'组织证据中':'开始研究'}{!loading&&<ArrowRight size={16}/>}</button></form>
    <div className="examples"><span>预设研究</span>{examples.map(x=><button key={x.intent} className={view.intent===x.intent?'selected':''} disabled={loading} onClick={()=>chooseExample(x.intent)}>{x.label}<ArrowUpRight size={12}/></button>)}</div>
    <div className="access-code-row"><label htmlFor="demo-access-code">AI 访问口令</label><input id="demo-access-code" type="password" autoComplete="off" value={accessCode} maxLength={100} disabled={loading} onChange={e=>setAccessCode(e.target.value)} placeholder="评委口令见提交说明"/><span>仅 AI 调用需要；示例与钻取可直接使用。口令不保存在浏览器。</span></div>
   </section>
   {message&&<div className="error-banner" role="alert"><CircleHelp size={17}/><div><strong>本次研究未生成</strong><p>{message}</p><small>下方仍是上一份研究，未用旧内容冒充本次回答。</small></div></div>}
   <div className="research-state" aria-live="polite"><span className={'state-badge '+(provenance?'ai':'')}><span/>{provenance?(cacheHit?'AI 结果 · 缓存复用':'AI 已组织证据'):'预设研究示例'}</span><span>{provenance?'受控选择与排序，财务内容由核验库提供':'未调用模型；点击「开始研究」运行 AI'}</span>{provenance&&<span className="latency">{(provenance.elapsed_ms/1000).toFixed(1)}s · {provenance.model}</span>}</div>
   <div className="research-layout"><div className="evidence-main">
    <section className="research-heading"><div><span className="section-eyebrow">本次研究重点</span><h2>{titles[view.intent||'profit_reconciliation']}</h2><p>{view.dimension_reason}</p></div><span className="evidence-total">{view.facts.length} 项事实 <span>+ {view.questions.length} 项未知</span></span></section>
    <div className="group-grid" aria-label="证据分类筛选">{groups.map(g=><button key={g.key} className={`group-tile ${g.key} ${filter===g.key?'chosen':''}`} onClick={()=>setFilter(filter===g.key?'all':g.key)} aria-pressed={filter===g.key}><g.icon size={17}/><strong>{counts[g.key]}<small>{g.name}</small></strong><span>{g.note}</span></button>)}</div>
    <div className="evidence-section-title"><h3>证据，不只是一段结论</h3>{filter!=='all'?<button className="text-button" onClick={()=>setFilter('all')}>显示全部 <X size={12}/></button>:<span>点击卡片，核对数据与出处 <ArrowRight size={13}/></span>}</div>
    <div className="fact-grid">{facts.map(f=><button className={`fact-card ${f.group}`} key={f.id} onClick={()=>setDrawer({kind:'fact',fact:f})}><div className="fact-top"><span className="fact-type">披露事实 · 计算</span><span className="evidence-id">{f.evidence_ids[0]}</span></div><h4>{f.title}</h4><div className={'fact-value '+(f.value.length>15?'long':'')}>{f.value}</div><p>{f.detail}</p><div className="fact-foot"><span>{f.group==='mixed'?<Layers3 size={12}/>:f.group==='negative'?<TrendingDown size={12}/>:<TrendingUp size={12}/>} {groups.find(g=>g.key===f.group)?.name}</span><span>查看依据 <ChevronRight size={13}/></span></div></button>)}
     {(filter==='all'||filter==='unknown')&&view.questions.map(q=><button className="fact-card unknown" key={q.id} onClick={()=>setDrawer({kind:'question',question:q})}><div className="fact-top"><span className="fact-type">待验证 · 不作结论</span><CircleHelp size={15}/></div><h4>{q.question}</h4><div className="unknown-label">当前证据不足</div><p>保留未知，明确下一步查什么，以及什么证据会改变判断。</p><div className="fact-foot"><span>不以推测代替事实</span><span>验证路径 <ChevronRight size={13}/></span></div></button>)}
    </div>
    {facts.length===0&&filter!=='unknown'&&<div className="empty-state">本研究路径没有单列这一类证据；不能据此推导“无风险”。</div>}
    <div className="scope-strip"><ShieldCheck size={16}/><p>正面 / 负面是相对研究命题的证据方向，不是股票评级；“交叉 / 分歧”也不表示事实相互矛盾。</p></div>
   </div><aside className="interpretation"><div className="interpretation-head"><span className="sparkle-box"><Target size={18}/></span><div><h3>如何读这些证据</h3><span>限定分析，不替你作投资决定</span></div></div>
    <div className="interpretation-question">{activeQuestion}</div>
    {view.relations.map((r,i)=><div className="relation" key={r.id}><span className="relation-index">{String(i+1).padStart(2,'0')}</span><div><span className="analysis-tag">{r.information_type}</span><p>{r.text}</p><button className="source-chip" onClick={()=>setDrawer({kind:'relation',relation:r})}><FileText size={11}/>{r.evidence_ids.join(' · ')}<ChevronRight size={11}/></button></div></div>)}
    <div className="next-step"><CircleHelp size={17}/><div><strong>结论会在什么情况下改变？</strong><p>{view.questions[0]?.change_condition}</p><button className="text-button" onClick={()=>setDrawer({kind:'question',question:view.questions[0]})}>展开验证路径 <ArrowRight size={12}/></button></div></div>
   </aside></div>
   <MarketContext onData={setMarket} onFact={id=>setDrawer({kind:'fact',fact:catalog.facts[id as keyof typeof catalog.facts] as Fact})}/>
   <footer><span>溯证 · 单标的研究原型</span><span>公开财报核验 ≠ 独立审计　/　不构成投资建议</span><button onClick={()=>setDrawer({kind:'about'})}>能力与边界 <ArrowUpRight size={12}/></button></footer>
  </main></div>
  {notice&&<div className="toast" role="status"><CheckCheck size={17}/>{notice}</div>}
  {drawer&&<div className="drawer-overlay" onClick={()=>setDrawer(null)}><aside className="drawer" role="dialog" aria-modal="true" aria-label="研究依据与验证明细" tabIndex={-1} ref={drawerRef} onClick={e=>e.stopPropagation()}><div className="drawer-top"><span><Layers3 size={16}/>研究依据</span><button className="icon-button" aria-label="关闭明细" onClick={()=>setDrawer(null)}><X size={20}/></button></div><div className="drawer-body">
   {drawer.kind==='fact'&&<FactDetail fact={drawer.fact}/>}
   {drawer.kind==='relation'&&<><span className="drawer-kicker">{drawer.relation.information_type} · 预核验关系库</span><h2>分析依据与适用边界</h2><p>{drawer.relation.text}</p><h3>这段解释依赖哪些事实</h3>{drawer.relation.required_fact_ids.map(id=>{const fact=view.facts.find(f=>f.id===id);return fact&&<button className="linked-fact" key={id} onClick={()=>setDrawer({kind:'fact',fact})}><span>{fact.title}<small>{fact.evidence_ids.join(' · ')}</small></span><strong>{fact.value}</strong><ChevronRight size={15}/></button>;})}<SourceLinks pages={drawer.relation.source_pages}/><div className="boundary-note">这是已有证据支持的限定解释，不是模型自由生成的因果结论。公司解释按公司口径标注，不能等同于独立证明。</div></>}
   {drawer.kind==='question'&&<><span className="drawer-kicker">待验证 · {drawer.question.type}</span><h2>{drawer.question.question}</h2><div className="unknown-block"><CircleHelp size={22}/><p>目前没有足够证据支持确定性归因。这里展示研究任务，不是事实结论。</p></div><h3>下一步查什么</h3><p>{drawer.question.verification_path}</p><h3>更新判断的条件</h3><p>{drawer.question.change_condition}</p><SourceLinks pages={view.intent==='cash_quality'?[99,177]:view.intent==='operating_margin'?[171]:[7,8,173,174,204]}/><div className="boundary-note">未接入持续监测与更新推送；材料未补齐时不输出归因占比。</div></>}
   {drawer.kind==='sources'&&<><span className="drawer-kicker">数据来源与时间口径</span><h2>每个数字，都能回到原文</h2><div className="source-document"><FileText size={24}/><div><strong>{data.reference.title}</strong><p>公司披露 · 深交所公开文件</p></div></div><dl className="metadata-list"><dt>本期</dt><dd>2026-01-01 至 2026-06-30</dd><dt>比较期</dt><dd>2025-01-01 至 2025-06-30</dd><dt>报表范围</dt><dd>合并报表，累计半年</dd><dt>原文金额单位</dt><dd>人民币千元</dd><dt>程序标准单位</dt><dd>人民币元（原值 × 1,000）</dd><dt>页面金额单位</dt><dd>亿元，展示时四舍五入</dd><dt>版本</dt><dd>{data.baseline_version}</dd></dl><SourceLinks pages={[7,8,98,99,171,173,174,177,204]}/><h3>必须知道的限制</h3><ul className="plain-list"><li>2025 年数字来自 2026H1 报告的比较列，不是最初披露版本的历史快照。</li><li>人工核对的公开财报固定截面，未接入财报自动更新。“已核验”不代表实时。</li><li>行情、估值和三家公司样本由服务端扶摇接口提供，展开多维背景查看数据时点和口径；同行样本不是行业排名。</li><li>AI 只选择和排序预核验内容，不是任意金融论断的自动事实验证器。</li><li>报告后公告和新闻未持续接入。财报期次、行情快照和历史交易区间分别标注，不能混同。</li></ul>{provenance&&<><h3>本次模型调用记录</h3><dl className="metadata-list"><dt>模型</dt><dd>{provenance.model}</dd><dt>请求标识</dt><dd className="break-all">{provenance.request_id||'未提供'}</dd><dt>调用时间</dt><dd>{new Date(provenance.generated_at).toLocaleString('zh-CN',{hour12:false})}</dd><dt>用量</dt><dd>{provenance.total_tokens??'未提供'} tokens</dd><dt>复用状态</dt><dd>{cacheHit?'5 分钟内缓存':'新调用'}</dd></dl></>}</>}
   {drawer.kind==='saved'&&<><span className="drawer-kicker">本机浏览器存储</span><h2>已存研究</h2><p>保存的是问题、研究路径与时间，不是当时的 AI 输出快照；仅存当前浏览器，最多 20 条。</p>{saved.length===0?<div className="empty-state">还没有保存研究。返回工作台，点击「保存研究」。</div>:saved.map(s=><div className="saved-item" key={s.question}><strong>{s.question}</strong><small>{new Date(s.time).toLocaleString('zh-CN',{hour12:false})}</small><button className="text-button" disabled={loading} title={loading?'请等待当前研究完成':undefined} onClick={()=>{setView(preset(s.intent));setQuestion(s.question);setActiveQuestion(s.question);setProvenance(null);setMessage('');setFilter('all');setDrawer(null);}}>打开预设证据路径 <ArrowRight size={13}/></button></div>)}</>}
   {drawer.kind==='about'&&<><span className="drawer-kicker">产品能力与边界</span><h2>帮你研究，不替你判断</h2><h3>这版已实现</h3><ul className="plain-list"><li>美的集团三类问题识别与证据组织。</li><li>正面、负面、交叉证据及待验证问题分层。</li><li>可操作财务钻取、计算口径及财报出处。</li><li>真实服务端模型调用、结构校验、错误状态与本机研究入口保存。</li></ul><h3>有意收窄的 AI 角色</h3><p>模型选择与排序证据 ID，页面按确定性规则还原数字及预核验解释。不能自由生成财务结论；超出三条研究路径时提示范围限制。</p><h3>尚未实现</h3><p>全市场选股、实时财报流、行情与估值联动、同行可比口径处理、因果贡献拆解、持续监测。不提供买卖建议。</p><div className="boundary-note">候选人笔试研究原型，不是证券投资咨询或交易系统。</div></>}
  </div></aside></div>}
 </div>;
}
function SourceLinks({pages}:{pages:number[]}){return <div className="source-links"><h3><BookOpen size={16}/>回到原始证据</h3><p>美的集团 2026 年半年度报告 · 深交所披露文件。链接定位 PDF 页；如阅读器未跳转，请按页码查找。</p><div>{pages.map(page=><a key={page} href={`${data.reference.source_url}#page=${page}`} target="_blank" rel="noreferrer">第 {page} 页 <ExternalLink size={12}/></a>)}</div></div>;}
function FactDetail({fact}:{fact:Fact}){const bridge=fact.id==='F_NONRECURRING';const bridgeRows=bridge?profitBridgeRows(fact.raw_values):[];return <>
 <span className={`drawer-kicker ${fact.group}`}>披露事实与确定性计算 · {fact.evidence_ids.join(' / ')}</span><h2>{fact.title}</h2><div className={'detail-metric '+fact.group}>{fact.value}<small>{fact.detail}</small></div><div className="detail-period"><Clock3 size={14}/>{fact.period_basis}</div>
 {bridge&&<div className="profit-bridge"><h3>一条可核对的利润桥</h3><div className="bridge-comparison"><table><caption>单位：亿元；非经常性净额由两项归母利润差额计算</caption><thead><tr><th scope="col">期次</th><th scope="col">扣非归母</th><th scope="col">非经常性净额</th><th scope="col">归母</th></tr></thead><tbody>{bridgeRows.map(row=><tr key={row.period}><th scope="row">{row.label}</th><td>{formatYi(row.deducted)}</td><td className={row.nonrecurring<0?'negative-difference':'positive-difference'}>{row.nonrecurring>0?'+':''}{formatYi(row.nonrecurring)}</td><td>{formatYi(row.parent)}</td></tr>)}</tbody></table></div><div className="bridge-equation">归母 = 扣非归母 + 税后归母非经常性损益净额</div><p>比较期净额为负，不能忽略。展示值分别四舍五入，勾稽使用下方未取整的原值；这不是因果贡献分解。</p></div>}
 <h3>原始字段与财务期次</h3><p className="fact-data-caption">以下为标准化原值（人民币元），来自同一报告比较列。</p><div className="raw-table-wrap" role="region" aria-label="两期财务原始字段，可横向滚动" tabIndex={0}><table className="raw-table"><thead><tr><th scope="col">字段</th><th scope="col">2026H1</th><th scope="col">2025H1</th></tr></thead><tbody>{fact.source_field_names.map(field=><tr key={field}><th scope="row">{labels[field]||field}</th><td>{Number(fact.raw_values['2026-06-30'][field]).toLocaleString('zh-CN')}</td><td>{Number(fact.raw_values['2025-06-30'][field]).toLocaleString('zh-CN')}</td></tr>)}</tbody></table></div>
 {bridge&&<div className="derived-row"><span>差额计算值（元）</span>{bridgeRows.map(row=><span key={row.period}>{row.label}：<strong>{row.nonrecurring.toLocaleString('zh-CN')}</strong></span>)}</div>}
 <h3>计算规则</h3><div className="formula">{fact.formula}</div><p className="fact-data-caption">原文千元 × 1,000 → 元；展示亿元时 ÷ 100,000,000。计算使用原值，最后展示时取整。</p><h3>这条证据不能证明什么</h3><div className="boundary-note"><ShieldCheck size={17}/><p>{fact.limitation}</p></div><SourceLinks pages={bridge?[...new Set([...fact.source_pages,8,204])]:fact.source_pages}/>
 {bridge&&<><h3>继续研究，而非就此归因</h3><p>差额核对说明会计对应关系；下一步需核对税前金融项目、所得税及少数股东归属。不能将全部 68.51 亿元当作外汇对冲收益。</p></>}
 </>;}
