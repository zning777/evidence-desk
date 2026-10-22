export interface MarketView{status:string;fetched_at?:string;cached?:boolean;message?:string;
 snapshot?:{timestamp:number;price:number;previous_close:number;change:number;change_pct:number};
 valuations?:{timestamp:number;items:{code:string;name:string;pe_ttm:number|null;pb_mrq:number|null}[]};
 trend?:{period_start:number;period_end:number;intervals:number;stock_return_pct:number;index_return_pct:number;relative_change_pp:number;max_close_drawdown_pct:number;stock_start_close:number;stock_end_close:number;index_start_close:number;index_end_close:number;stock_adjust:string;index_basis:string};
 errors?:Record<string,string>;sources?:{name:string;request_id?:string;timestamp?:number;retrieved_at:string}[];
}
