export type Group = 'positive' | 'negative' | 'mixed';
export interface Fact { id:string; group:Group; title:string; value:string; detail:string; formula:string; limitation:string;
  research_proposition:string; information_type:string; period_basis:string; evidence_ids:string[]; source_url:string;
  source_pages:number[]; source_field_names:string[]; raw_values:Record<string,Record<string,string>>; }
export interface Relation { id:string; text:string; information_type:string; evidence_ids:string[]; required_fact_ids:string[]; source_url:string; source_pages:number[]; }
export interface Question {id:string; type:string; question:string; verification_path:string; change_condition:string;}
export interface Research {status:string; intent?:string; dimension_reason?:string; facts:Fact[]; relations:Relation[]; questions:Question[]; selection_origin?:string; reason?:string;}
