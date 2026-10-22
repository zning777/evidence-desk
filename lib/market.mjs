export function finite(value){return typeof value==='number'&&Number.isFinite(value);}
export function validateSnapshot(data){
 const row=data?.item?.find(x=>x.thscode==='000333.SZ');
 if(!row||!finite(data.timestamp)||!finite(row.last_price)||row.last_price<=0||!finite(row.prev_price)||row.prev_price<=0)throw Error('missing_snapshot_fields');
 const change=row.last_price-row.prev_price,changePct=(row.last_price/row.prev_price-1)*100;
 if(!finite(row.price_change_ratio_pct)||Math.abs(changePct-row.price_change_ratio_pct)>.02)throw Error('conflicting_price_change');
 return {timestamp:data.timestamp,price:row.last_price,previous_close:row.prev_price,change,change_pct:changePct};
}
export function validateValuations(data){
 const codes=['000333.SZ','600690.SH','000651.SZ'];
 if(!finite(data?.timestamp))throw Error('missing_valuation_timestamp');
 const items=codes.map(code=>{const row=data.item?.find(x=>x.thscode===code);if(!row||!finite(row.pe_ttm)||!finite(row.pb_mrq))throw Error('missing_valuation_fields');return {code,name:row.name,pe_ttm:row.pe_ttm>0?row.pe_ttm:null,pb_mrq:row.pb_mrq>0?row.pb_mrq:null};});
 return {timestamp:data.timestamp,items};
}
export function computeTrend(stock,index){
 if(stock?.adjust!=='forward'||stock?.thscode!=='000333.SZ'||index?.thscode!=='000300.SH')throw Error('wrong_history_basis');
 const cutoff=Date.parse('2026-10-21T23:59:59+08:00');
 function rows(data){const map=new Map();for(const row of data?.item||[]){if(!finite(row.date_ms)||!finite(row.close_price)||row.close_price<=0||row.date_ms>cutoff)throw Error('invalid_or_unclosed_bar');if(map.has(row.date_ms))throw Error('duplicate_bar');map.set(row.date_ms,row.close_price);}return map;}
 const s=rows(stock),b=rows(index),dates=[...s.keys()].filter(d=>b.has(d)).sort((a,c)=>a-c).slice(-21);
 if(dates.length<21)throw Error('insufficient_common_trading_days');
 const first=dates[0],last=dates.at(-1),stockReturn=(s.get(last)/s.get(first)-1)*100,indexReturn=(b.get(last)/b.get(first)-1)*100;
 let peak=s.get(first),drawdown=0;for(const date of dates){peak=Math.max(peak,s.get(date));drawdown=Math.min(drawdown,(s.get(date)/peak-1)*100);}
 return {period_start:first,period_end:last,intervals:20,stock_return_pct:stockReturn,index_return_pct:indexReturn,relative_change_pp:stockReturn-indexReturn,max_close_drawdown_pct:drawdown,
  stock_start_close:s.get(first),stock_end_close:s.get(last),index_start_close:b.get(first),index_end_close:b.get(last),stock_adjust:'forward',index_basis:'价格指数，非全收益指数'};
}
