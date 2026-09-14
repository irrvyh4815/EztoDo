import test from "node:test";
import assert from "node:assert/strict";
import { filterCommonSettingItems, moveCommonSettingItem } from "../src/commonSettings.js";
const items = [
  { id:"a", name:"泥作工班", aliases:["泥作班"], statisticsCategory:"泥作", isActive:true, sortOrder:1 },
  { id:"b", name:"水泥", unit:"包", aliases:["卜特蘭水泥"], isActive:false, sortOrder:2 },
  { id:"c", name:"挖土機", specification:"120型", isActive:true, sortOrder:3 },
];
test("common settings search combines aliases, units and specifications with active filtering", () => {
  assert.deepEqual(filterCommonSettingItems(items,"泥作班","active").map(i=>i.id),["a"]);
  assert.equal(filterCommonSettingItems(items,"包","active").length,0);
  assert.deepEqual(filterCommonSettingItems(items,"卜特蘭","inactive").map(i=>i.id),["b"]);
  assert.deepEqual(filterCommonSettingItems(items,"120","all").map(i=>i.id),["c"]);
  assert.equal(filterCommonSettingItems(items,"   ","all").length,3);
});
test("reordering uses stable IDs and preserves settings and boundary positions", () => {
  const next = moveCommonSettingItem(items,"c",-1);
  assert.deepEqual(next.map(i=>i.id),["a","c","b"]);
  assert.deepEqual(next.map(i=>i.sortOrder),[1,2,3]);
  assert.equal(next[2].isActive,false);
  assert.equal(items[2].sortOrder,3);
  assert.deepEqual(moveCommonSettingItem(items,"a",-1),items);
  assert.deepEqual(moveCommonSettingItem(items,"unknown",1),items);
});
