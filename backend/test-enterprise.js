async function run() {
  try {
    console.log("Authenticating...");
    const loginRes = await fetch('http://localhost:8080/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alex@taskflow.dev', password: 'Password123!' })
    });
    const loginData = await loginRes.json();
    console.log("Login result:", loginData.message, loginData.user?.email);
    const token = loginData.accessToken;
    const authHeaders = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };

    const wsRes = await fetch('http://localhost:8080/api/v1/workspaces', { headers: authHeaders });
    const wsData = await wsRes.json();
    console.log("Workspaces result:", wsData);
    if (!wsData.data || wsData.data.length === 0) {
      console.log("No workspaces found for user! Creating one...");
      const newWs = await fetch('http://localhost:8080/api/v1/workspaces', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ name: "Acme Corp Workspace", slug: "acme-corp-" + Date.now() })
      });
      const newWsData = await newWs.json();
      wsData.data = [newWsData.data];
    }
    const workspaceId = wsData.data[0].id;

    const projRes = await fetch('http://localhost:8080/api/v1/workspaces/' + workspaceId + '/projects', { headers: authHeaders });
    const projData = await projRes.json();
    if (!projData.data || projData.data.length === 0) {
      console.log("Creating default project...");
      const newProj = await fetch('http://localhost:8080/api/v1/workspaces/' + workspaceId + '/projects', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ name: "Core Platform Sprint" })
      });
      const newProjData = await newProj.json();
      projData.data = [newProjData.data];
    }
    const projectId = projData.data[0].id;

    const tasksRes = await fetch('http://localhost:8080/api/v1/projects/' + projectId + '/tasks', { headers: authHeaders });
    const tasksData = await tasksRes.json();
    if (!tasksData.data || tasksData.data.length === 0) {
      console.log("Creating default task...");
      const newTask = await fetch('http://localhost:8080/api/v1/projects/' + projectId + '/tasks', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ title: "Fix Real-Time Concurrency Bugs", priority: "high" })
      });
      const newTaskData = await newTask.json();
      tasksData.data = [newTaskData.data];
    }
    const task = tasksData.data[0];
    console.log('✅ 1. Tasks loaded. Target task:', task.title, 'version:', task.version);

    // Concurrency Conflict Test
    const conflictRes = await fetch('http://localhost:8080/api/v1/tasks/' + task.id, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ title: 'Overwritten Title', version: 99999 })
    });
    const conflictData = await conflictRes.json();
    console.log('✅ 2. Concurrency Conflict (Expected 409): Status =', conflictRes.status, conflictData.error?.message);

    // Normal Update with correct version
    const updateRes = await fetch('http://localhost:8080/api/v1/tasks/' + task.id, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ title: task.title, version: task.version })
    });
    const updateData = await updateRes.json();
    console.log('✅ 3. Valid Optimistic Update: Status =', updateRes.status, 'New version =', updateData.data?.version);

    // XSS Sanitization Test
    const xssRes = await fetch('http://localhost:8080/api/v1/tasks/' + task.id, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ description: '<script>stealCookie()</script><p>Safe Description</p>' })
    });
    const xssData = await xssRes.json();
    console.log('✅ 4. XSS Sanitization: Clean description =', JSON.stringify(xssData.data?.description));

    // Idempotency Key Test
    const idempKey = 'idemp-' + Date.now();
    const idempRes1 = await fetch('http://localhost:8080/api/v1/projects/' + projectId + '/tasks', {
      method: 'POST',
      headers: { ...authHeaders, 'Idempotency-Key': idempKey },
      body: JSON.stringify({ title: 'Idempotent Task Test' })
    });
    const idempData1 = await idempRes1.json();

    const idempRes2 = await fetch('http://localhost:8080/api/v1/projects/' + projectId + '/tasks', {
      method: 'POST',
      headers: { ...authHeaders, 'Idempotency-Key': idempKey },
      body: JSON.stringify({ title: 'Idempotent Task Test' })
    });
    const idempData2 = await idempRes2.json();
    console.log('✅ 5. Idempotency Key: Replay header =', idempRes2.headers.get('x-idempotency-replay'), 'Task ID match =', idempData1.data?.id === idempData2.data?.id);

    // Soft Delete & Trash & Restore
    const newTaskId = idempData1.data?.id;
    const delRes = await fetch('http://localhost:8080/api/v1/tasks/' + newTaskId, {
      method: 'DELETE',
      headers: authHeaders
    });
    console.log('✅ 6. Soft Delete: Status =', delRes.status);

    const trashRes = await fetch('http://localhost:8080/api/v1/projects/' + projectId + '/trash', { headers: authHeaders });
    const trashData = await trashRes.json();
    console.log('✅ 7. Trash / Recycle Bin: Found items in trash =', trashData.data?.length);

    const restoreRes = await fetch('http://localhost:8080/api/v1/tasks/' + newTaskId + '/restore', {
      method: 'POST',
      headers: authHeaders
    });
    console.log('✅ 8. Restore from Trash: Status =', restoreRes.status);

    // Background Job Queue (202 Accepted)
    const jobRes = await fetch('http://localhost:8080/api/v1/workspaces/' + workspaceId + '/invitations/async', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ emails: ['sarah@taskflow.local', 'priya@taskflow.local'] })
    });
    const jobData = await jobRes.json();
    console.log('✅ 9. Background Job Queue (Expected 202): Status =', jobRes.status, 'Job ID =', jobData.job?.id);

    await new Promise(r => setTimeout(r, 1500));
    const jobCheck = await fetch('http://localhost:8080/api/v1/jobs/' + jobData.job?.id);
    const jobCheckData = await jobCheck.json();
    console.log('✅ 10. Redis Worker Job State:', jobCheckData.data?.status, 'Progress:', jobCheckData.data?.progress, '% Result:', jobCheckData.data?.result?.deliveredCount, 'emails dispatched');

    // SOC 2 Audit Logs
    const auditRes = await fetch('http://localhost:8080/api/v1/workspaces/' + workspaceId + '/audit-logs', { headers: authHeaders });
    const auditData = await auditRes.json();
    console.log('✅ 11. SOC 2 Audit Logs: Entries count =', auditData.data?.length, 'Latest action =', auditData.data[0]?.action, 'Actor =', auditData.data[0]?.actor?.displayName);
  } catch (err) {
    console.error("Test failed:", err);
  }
}

run();
