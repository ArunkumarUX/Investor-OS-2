import assert from 'node:assert/strict';
const base = process.env.INVEST_OS_TEST_URL || 'http://localhost:3333';
const created = [];
async function req(path, method = 'GET', body) {
  const response = await fetch(base + path, {method, headers: body ? {'Content-Type':'application/json'} : {}, body:body ? JSON.stringify(body) : undefined});
  const data = await response.json();
  return {status:response.status, data};
}
try {
  assert.equal((await req('/api/data/missing')).status,404);
  assert.equal((await req('/api/data/tasks','POST',{title:''})).status,400);
  assert.equal((await req('/api/data/commitments','POST',{lp:'QA',vintage:'QA',committed:100,called:101})).status,400);
  const task = await req('/api/data/tasks','POST',{title:'QA automated persistence test',owner:'QA',status:'open'});
  assert.equal(task.status,201); created.push(['tasks',task.data.item.id]);
  assert.equal((await req('/api/data/tasks','PATCH',{id:task.data.item.id,status:'done'})).status,200);
  const rows = await req('/api/data/tasks');
  assert.equal(rows.data.items.find(r=>r.id===task.data.item.id).status,'done');
  assert.equal((await req('/api/data/tasks','PATCH',{id:task.data.item.id,status:'invalid'})).status,400);
  const concurrent = await Promise.all(['A','B','C'].map(title=>req('/api/data/tasks','POST',{title:`QA concurrency ${title}`,owner:'QA',status:'open'})));
  concurrent.forEach(result => {assert.equal(result.status,201);created.push(['tasks',result.data.item.id]);});
  const after = (await req('/api/data/tasks')).data.items;
  for (const [,id] of created) assert.ok(after.some(r=>r.id===id));
  console.log('PASS: validation, unknown collection, persistence, updates, and concurrent creation.');
} finally {
  for(const [collection,id] of created) assert.equal((await req(`/api/data/${collection}?id=${encodeURIComponent(id)}`,'DELETE')).status,200);
}
