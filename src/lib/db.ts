import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import type { DecisionRecord } from "./types";

const dir=path.join(process.cwd(),"data"); fs.mkdirSync(dir,{recursive:true});
const db=new DatabaseSync(path.join(dir,"blackbox.db"));
db.exec(`PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS agents(id TEXT PRIMARY KEY,name TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS mandates(id TEXT PRIMARY KEY,agent_id TEXT NOT NULL,max_notional REAL NOT NULL,trading_enabled INTEGER NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS decisions(id TEXT PRIMARY KEY,created_at TEXT NOT NULL,symbol TEXT NOT NULL,action TEXT NOT NULL,confidence REAL NOT NULL,thesis TEXT NOT NULL,status TEXT NOT NULL,known_then TEXT NOT NULL,known_now TEXT,execution TEXT,incident TEXT);
CREATE TABLE IF NOT EXISTS tool_calls(id TEXT PRIMARY KEY,decision_id TEXT NOT NULL,tool_name TEXT NOT NULL,arguments TEXT NOT NULL,response TEXT,status TEXT NOT NULL,started_at TEXT NOT NULL,ended_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS market_snapshots(id TEXT PRIMARY KEY,decision_id TEXT NOT NULL,captured_at TEXT NOT NULL,payload TEXT NOT NULL,source TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS decision_quality(id TEXT PRIMARY KEY,decision_id TEXT UNIQUE NOT NULL,label TEXT NOT NULL,reason TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS executions(id TEXT PRIMARY KEY,decision_id TEXT UNIQUE NOT NULL,status TEXT NOT NULL,payload TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS incidents(id TEXT PRIMARY KEY,decision_id TEXT NOT NULL,kind TEXT NOT NULL,detail TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS counterfactuals(id TEXT PRIMARY KEY,decision_id TEXT NOT NULL,horizon_minutes INTEGER NOT NULL,result TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS investigations(id TEXT PRIMARY KEY,decision_id TEXT NOT NULL,question TEXT NOT NULL,answer TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS postmortems(id TEXT PRIMARY KEY,decision_id TEXT NOT NULL,body TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS autonomy_readiness(id TEXT PRIMARY KEY,agent_id TEXT NOT NULL,score REAL NOT NULL,reason TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS feedback_rules(id TEXT PRIMARY KEY,agent_id TEXT NOT NULL,rule_text TEXT NOT NULL,approved INTEGER NOT NULL,created_at TEXT NOT NULL);`);
const now=new Date().toISOString();
db.prepare("INSERT OR IGNORE INTO agents VALUES(?,?,?)").run("trader-1","Black Box Trader",now);
db.prepare("INSERT OR IGNORE INTO mandates VALUES(?,?,?,?,?)").run("mandate-1","trader-1",Number(process.env.BLACKBOX_MAX_NOTIONAL_USDT||5),process.env.BLACKBOX_TRADING_ENABLED==="true"?1:0,now);
const parse=(v:unknown)=>v?JSON.parse(String(v)):null;
export function listDecisions():DecisionRecord[]{return db.prepare(`SELECT d.*,q.label quality,q.reason quality_reason FROM decisions d LEFT JOIN decision_quality q ON q.decision_id=d.id ORDER BY d.created_at DESC LIMIT 50`).all().map((r:any)=>({id:r.id,createdAt:r.created_at,symbol:r.symbol,action:r.action,confidence:r.confidence,thesis:r.thesis,status:r.status,quality:r.quality||"INSUFFICIENT_EVIDENCE",qualityReason:r.quality_reason||"Not evaluated",knownThen:parse(r.known_then),knownNow:parse(r.known_now),execution:parse(r.execution),incident:r.incident})) as DecisionRecord[]}
export function getDecision(id:string){return listDecisions().find(d=>d.id===id)||null}
export function persistDecision(input:Omit<DecisionRecord,"quality"|"qualityReason">&{quality:string;qualityReason:string;toolCall:{name:string,args:unknown,response:unknown,status:string,startedAt:string,endedAt:string}}){db.exec("BEGIN");try{db.prepare("INSERT INTO decisions VALUES(?,?,?,?,?,?,?,?,?,?,?,?)").run(input.id,input.createdAt,input.symbol,input.action,input.confidence,input.thesis,input.status,JSON.stringify(input.knownThen),input.knownNow?JSON.stringify(input.knownNow):null,input.execution?JSON.stringify(input.execution):null,input.incident);db.prepare("INSERT INTO tool_calls VALUES(?,?,?,?,?,?,?,?)").run(crypto.randomUUID(),input.id,input.toolCall.name,JSON.stringify(input.toolCall.args),JSON.stringify(input.toolCall.response),input.toolCall.status,input.toolCall.startedAt,input.toolCall.endedAt);db.prepare("INSERT INTO market_snapshots VALUES(?,?,?,?,?)").run(crypto.randomUUID(),input.id,input.createdAt,JSON.stringify(input.knownThen),"BINANCE_AGENTIC_MCP");db.prepare("INSERT INTO decision_quality VALUES(?,?,?,?,?)").run(crypto.randomUUID(),input.id,input.quality,input.qualityReason,input.createdAt);if(input.incident)db.prepare("INSERT INTO incidents VALUES(?,?,?,?,?)").run(crypto.randomUUID(),input.id,"INTEGRATION_OR_POLICY",input.incident,input.createdAt);db.exec("COMMIT")}catch(error){db.exec("ROLLBACK");throw error}}
export function readiness(){const rows=listDecisions();if(!rows.length)return {score:0,reason:"No recorded decisions yet"};const usable=rows.filter(r=>r.quality!=="INSUFFICIENT_EVIDENCE");const good=usable.filter(r=>r.quality==="REASONABLE").length;const score=Math.round((good/Math.max(usable.length,1))*100);return {score,reason:`${good} of ${usable.length} evaluable decisions were reasonable; ${rows.length-usable.length} lacked evidence.`}}
export {db};
