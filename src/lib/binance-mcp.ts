type Rpc={jsonrpc:"2.0";id:number;method:string;params?:unknown};
export class BinanceMcpClient{
 private id=0; private session?:string;
 constructor(private url=process.env.BINANCE_MCP_URL||"https://agent.binance.com/mcp/agentic"){}
 private headers(){let extra:Record<string,string>={};try{extra=JSON.parse(process.env.BINANCE_MCP_HEADERS_JSON||"{}")}catch{throw new Error("BINANCE_MCP_HEADERS_JSON is not valid JSON")};return {"content-type":"application/json","accept":"application/json, text/event-stream",...(process.env.BINANCE_MCP_AUTH?{authorization:process.env.BINANCE_MCP_AUTH}:{}),...(this.session?{"mcp-session-id":this.session}:{}),...extra}}
 private async rpc(method:string,params?:unknown){const body:Rpc={jsonrpc:"2.0",id:++this.id,method,...(params?{params}:{})};const res=await fetch(this.url,{method:"POST",headers:this.headers(),body:JSON.stringify(body),cache:"no-store"});this.session=res.headers.get("mcp-session-id")||this.session;const text=await res.text();if(!res.ok)throw new Error(`Binance MCP ${res.status}: ${text.slice(0,240)}`);const data=text.startsWith("event:")?JSON.parse(text.split("\ndata: ").at(-1)!.trim()):JSON.parse(text);if(data.error)throw new Error(data.error.message||"MCP error");return data.result}
 async connect(){await this.rpc("initialize",{protocolVersion:"2025-03-26",capabilities:{},clientInfo:{name:"black-box",version:"0.1.0"}});return this.rpc("tools/list",{})}
 async call(name:string,args:unknown){return this.rpc("tools/call",{name,arguments:args})}
}
