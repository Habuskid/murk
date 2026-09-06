import test from "node:test";import assert from "node:assert/strict";import {checkPolicy} from "../src/lib/policy";
test("blocks exposure above the server mandate",()=>{process.env.BLACKBOX_MAX_NOTIONAL_USDT="5";process.env.BLACKBOX_TRADING_ENABLED="true";assert.equal(checkPolicy({symbol:"BTCUSDT",action:"BUY",confidence:.5,thesis:"x",notionalUsdt:6}).allowed,false)});
test("allows HOLD while live trading is disabled",()=>{process.env.BLACKBOX_TRADING_ENABLED="false";assert.equal(checkPolicy({symbol:"BTCUSDT",action:"HOLD",confidence:.5,thesis:"x",notionalUsdt:0}).allowed,true)});
