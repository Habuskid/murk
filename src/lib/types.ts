export type QualityLabel="REASONABLE"|"QUESTIONABLE"|"POOR"|"INSUFFICIENT_EVIDENCE";
export type DecisionStatus="RECORDED"|"POLICY_BLOCKED"|"EXECUTED"|"EXECUTION_FAILED";
export interface DecisionRecord{id:string;createdAt:string;symbol:string;action:string;confidence:number;thesis:string;status:DecisionStatus;quality:QualityLabel;qualityReason:string;knownThen:unknown;knownNow:unknown|null;execution:unknown|null;incident:string|null;}
