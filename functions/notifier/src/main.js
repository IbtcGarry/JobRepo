// JobTest notifier — the project's Node.js backend, deployed as an Appwrite Function.
//
// Appwrite runs this file:
//   - on database events (configured on the function):
//       applications row created  → tell the company's owners and managers someone applied
//       applications row updated  → tell the applicant their application moved stage
//       jobs row created/updated  → tell users whose job alerts match a newly open job
//                                    (once per job: alertsSentAt marks it done, so later edits
//                                    and view-count updates don't send alerts again)
//       invites row created       → tell the invited user
//   - every hour (an Appwrite "interval" of 60 minutes) → close open jobs whose closing date has passed
//   - by hand from the Appwrite console (Functions → notifier → Execute) with the body
//       {"task": "close-expired"}  → the same clean-up, without waiting for the hour
//
// It writes rows to the `notifications` table, which the website's bell reads live.
// Auth: Appwrite hands each run a short-lived server key in the x-appwrite-key header.

import { Client, ID, Permission, Query, Role, TablesDB } from 'node-appwrite';

import { matchesAlert } from './match.js';

const DB = 'main';

/** Stage names shown to applicants; keep in step with PIPELINE in application.service.ts. */
const STAGES = { submitted: 'New', reviewing: 'Reviewing', interview: 'Interview', offer: 'Offer', hired: 'Hired', rejected: 'Rejected' };

/** Entry point: Appwrite calls this for every event and every scheduled run. */
export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT ?? 'https://fra.cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers['x-appwrite-key']);
  const db = new TablesDB(client);

  const trigger = req.headers['x-appwrite-trigger'];
  const event = req.headers['x-appwrite-event'] ?? '';
  const row = req.bodyJson ?? {};

  try {
    if (trigger === 'schedule' || (trigger === 'http' && row.task === 'close-expired')) {
      const closed = await closeExpiredJobs(db);
      log(`Closed ${closed} expired job(s).`);
    } else if (event.includes('.tables.applications.') && event.endsWith('.create')) {
      await notifyNewApplicant(db, row);
    } else if (event.includes('.tables.applications.') && event.endsWith('.update')) {
      await notifyStageChange(db, row);
    } else if (event.includes('.tables.jobs.') && row.status === 'open' && !row.alertsSentAt) {
      const sent = await notifyJobAlerts(db, row);
      await db.updateRow({ databaseId: DB, tableId: 'jobs', rowId: row.$id, data: { alertsSentAt: new Date().toISOString() } });
      log(`Job alerts sent: ${sent}.`);
    } else if (event.includes('.tables.invites.') && event.endsWith('.create')) {
      await notifyInvite(db, row);
    }
    return res.json({ ok: true });
  } catch (err) {
    error(String(err?.stack ?? err));
    return res.json({ ok: false, error: String(err?.message ?? err) }, 500);
  }
};

/** Write one notification that only its recipient can read and mark read. */
async function notify(db, userId, text, link) {
  const owner = Role.user(userId);
  await db.createRow({
    databaseId: DB,
    tableId: 'notifications',
    rowId: ID.unique(),
    data: { userId, text: text.slice(0, 300), link, read: false },
    permissions: [Permission.read(owner), Permission.update(owner), Permission.delete(owner)],
  });
}

/** Someone applied: notify every owner and manager of the job's company. */
async function notifyNewApplicant(db, application) {
  const { rows } = await db.listRows({
    databaseId: DB,
    tableId: 'profiles',
    queries: [Query.equal('companyId', application.companyId), Query.equal('companyRole', ['owner', 'manager']), Query.limit(50)],
  });
  const link = `/company/${application.companyId}/jobs/${application.jobId}/applicants`;
  for (const person of rows) {
    if (person.$id === application.applicantId) continue;
    await notify(db, person.$id, `${application.applicantName} applied to ${application.jobTitle}`, link);
  }
}

/** An application moved stage: tell the applicant. */
async function notifyStageChange(db, application) {
  const stage = STAGES[application.status] ?? application.status;
  await notify(db, application.applicantId, `Your application for ${application.jobTitle} is now: ${stage}`, '/applications');
}

/** A job is open: notify each alert owner whose saved search matches, once per job. */
async function notifyJobAlerts(db, job) {
  const link = `/jobs/${job.$id}`;
  const { rows: alerts } = await db.listRows({ databaseId: DB, tableId: 'alerts', queries: [Query.limit(500)] });
  let sent = 0;
  for (const alert of alerts) {
    if (alert.userId === job.postedBy) continue;
    let params;
    try {
      params = JSON.parse(alert.params);
    } catch {
      continue;
    }
    if (!matchesAlert(job, params)) continue;
    // Skip if this user was already told about this job (jobs are updated often).
    const { total } = await db.listRows({
      databaseId: DB,
      tableId: 'notifications',
      queries: [Query.equal('userId', alert.userId), Query.equal('link', link), Query.limit(1)],
    });
    if (total) continue;
    await notify(db, alert.userId, `New job for your alert "${alert.name}": ${job.title} at ${job.companyName}`, link);
    sent++;
  }
  return sent;
}

/** A company invited someone: tell the invited user (found by username). */
async function notifyInvite(db, invite) {
  const { rows } = await db.listRows({
    databaseId: DB,
    tableId: 'profiles',
    queries: [Query.equal('username', invite.username), Query.limit(1)],
  });
  if (rows[0]) await notify(db, rows[0].$id, `${invite.invitedBy} invited you to join ${invite.companyName}`, '/account?tab=company');
}

/** Close every open job whose closing date has passed; returns how many were closed. */
async function closeExpiredJobs(db) {
  const { rows } = await db.listRows({
    databaseId: DB,
    tableId: 'jobs',
    queries: [Query.equal('status', 'open'), Query.lessThan('expiresAt', new Date().toISOString()), Query.limit(100)],
  });
  for (const job of rows) {
    await db.updateRow({ databaseId: DB, tableId: 'jobs', rowId: job.$id, data: { status: 'closed' } });
  }
  return rows.length;
}
