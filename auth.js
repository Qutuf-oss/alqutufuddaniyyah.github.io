const { createClient } = window.supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const $ = id => document.getElementById(id);
const dashboardUrl = () => new URL('student-dashboard.html', window.location.href).href;
const loginUrl = () => new URL('student-login.html', window.location.href).href;

function message(text, ok = false) {
  const el = $('authMessage');
  if (!el) return;
  el.textContent = text;
  el.className = 'auth-message ' + (ok ? 'success' : '');
}

function busy(btn, on, label) {
  if (!btn) return;
  btn.disabled = on;
  if (on) {
    btn.dataset.old = btn.textContent;
    btn.textContent = label;
  } else {
    btn.textContent = btn.dataset.old || btn.textContent;
  }
}

function esc(v = '') {
  return String(v).replace(/[&<>'"]/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[c]));
}

function isHttpUrl(value = '') {
  try {
    const u = new URL(String(value).trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

async function ensureProfile(user) {
  const { data, error } = await supabaseClient
    .from('students').select('*').eq('id', user.id).maybeSingle();
  if (error) throw error;
  if (data) return data;

  const m = user.user_metadata || {};
  const profile = {
    id: user.id,
    full_name: m.full_name || user.email?.split('@')[0] || 'Student',
    email: user.email || '',
    phone: m.phone || '',
    country: m.country || '',
    programme: m.programme || ''
  };

  const res = await supabaseClient.from('students').insert(profile).select().single();
  if (res.error) throw res.error;
  return res.data;
}

$('loginForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.currentTarget;
  const btn = $('loginBtn');
  const fd = new FormData(form);
  const email = String(fd.get('email') || '').trim();
  const password = String(fd.get('password') || '');

  message('Signing you in…', true);
  busy(btn, true, 'Checking account…');
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.session) throw new Error('Login succeeded but a secure session was not returned. Please try again.');
    window.location.replace(dashboardUrl());
  } catch (err) {
    console.error(err);
    message(err.message || 'Unable to log in. Please check your email and password.');
  } finally {
    busy(btn, false);
  }
});

$('registerForm')?.addEventListener('submit', async e => {
  e.preventDefault();

  // Capture the form BEFORE any await. After an async wait, event.currentTarget
  // can be null, which was causing the old registration error.
  const form = e.currentTarget;
  const btn = $('registerBtn');
  const fd = new FormData(form);
  const email = String(fd.get('email') || '').trim();
  const password = String(fd.get('password') || '');
  const fullName = String(fd.get('full_name') || '').trim();
  const phone = String(fd.get('phone') || '').trim();
  const country = String(fd.get('country') || '').trim();
  const programme = String(fd.get('programme') || '').trim();

  if (password.length < 6) {
    message('Please use a password of at least 6 characters.');
    return;
  }

  message('Creating your student account…', true);
  busy(btn, true, 'Creating account…');

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, phone, country, programme },
        emailRedirectTo: dashboardUrl()
      }
    });

    if (error) throw error;

    // Do not clear the form when email confirmation is required.
    // If Supabase returns a session immediately, the account is ready to use.
    if (data.session) {
      form.reset();
      window.location.replace(dashboardUrl());
    } else {
      message('Account created successfully. Please confirm your email, then use Student Login. Your registration details have been kept on this form.', true);
    }
  } catch (err) {
    console.error(err);
    message(err.message || 'Unable to create the account.');
  } finally {
    busy(btn, false);
  }
});

async function loadClasses() {
  const list = $('classesList');
  if (!list) return;
  list.innerHTML = '<p class="muted">Loading classes…</p>';

  const { data, error } = await supabaseClient
    .from('classes')
    .select('id,title,programme,start_time,duration_minutes,zoom_link,tutor')
    .order('start_time', { ascending: true });

  if (error) {
    console.error(error);
    list.innerHTML = '<div class="empty-card"><strong>Classes could not be loaded.</strong><p>Please check your connection or ask the academy to review the class schedule.</p></div>';
    return;
  }

  if (!data?.length) {
    list.innerHTML = '<div class="empty-card"><strong>No classes scheduled yet.</strong><p>Your tutor will add the next class to your dashboard.</p></div>';
    return;
  }

  list.innerHTML = data.map(c => {
    const d = new Date(c.start_time);
    const date = d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    const link = String(c.zoom_link || '').trim();
    const linkButton = isHttpUrl(link)
      ? `<a class="btn primary" href="${esc(link)}" target="_blank" rel="noopener">Join Class</a>`
      : '<span class="muted">Class link not available yet</span>';

    return `<article class="class-card">
      <div>
        <span class="eyebrow">${esc(c.programme || 'CLASS')}</span>
        <h4>${esc(c.title)}</h4>
        <p>${esc(date)}${c.duration_minutes ? ` · ${esc(c.duration_minutes)} minutes` : ''}</p>
        ${c.tutor ? `<p>Tutor: ${esc(c.tutor)}</p>` : ''}
      </div>
      ${linkButton}
    </article>`;
  }).join('');
}

async function loadAttendance(userId) {
  const box = $('attendanceList');
  if (!box) return;
  box.innerHTML = '<p class="muted">Loading attendance…</p>';

  const { data, error } = await supabaseClient
    .from('attendance')
    .select('attendance_date,status,tutor_note,class_id,classes(title,programme)')
    .eq('student_id', userId)
    .order('attendance_date', { ascending: false });

  if (error) {
    console.error(error);
    box.innerHTML = '<div class="empty-card"><strong>Attendance could not be loaded.</strong><p>Please try again later.</p></div>';
    return;
  }
  if (!data?.length) {
    box.innerHTML = '<div class="empty-card"><strong>No attendance records yet.</strong><p>Your attendance will appear here after your tutor records a class.</p></div>';
    return;
  }

  box.innerHTML = data.map(a => `<div class="portal-row">
    <div><strong>${esc(a.classes?.title || 'Class')}</strong><span>${esc(a.attendance_date)}</span></div>
    <div><strong>${esc(a.status)}</strong>${a.tutor_note ? `<span>${esc(a.tutor_note)}</span>` : ''}</div>
  </div>`).join('');
}

async function loadProgress(userId) {
  const box = $('progressList');
  if (!box) return;
  box.innerHTML = '<p class="muted">Loading progress…</p>';

  const { data, error } = await supabaseClient
    .from('student_progress')
    .select('programme,subject,progress_percentage,current_level,tutor_comment,updated_at')
    .eq('student_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error(error);
    box.innerHTML = '<div class="empty-card"><strong>Progress could not be loaded.</strong><p>Please try again later.</p></div>';
    return;
  }
  if (!data?.length) {
    box.innerHTML = '<div class="empty-card"><strong>No progress report yet.</strong><p>Your tutor will add your learning progress here.</p></div>';
    return;
  }

  box.innerHTML = data.map(p => `<div class="progress-card">
    <div class="portal-row"><div><strong>${esc(p.subject)}</strong><span>${esc(p.programme)}</span></div><strong>${Number(p.progress_percentage || 0)}%</strong></div>
    <div class="progress-track"><div class="progress-fill" style="width:${Math.max(0, Math.min(100, Number(p.progress_percentage || 0)))}%"></div></div>
    ${p.current_level ? `<p><strong>Level:</strong> ${esc(p.current_level)}</p>` : ''}
    ${p.tutor_comment ? `<p><strong>Tutor comment:</strong> ${esc(p.tutor_comment)}</p>` : ''}
  </div>`).join('');
}

function renderProfile(p) {
  const box = $('profileDetails');
  if (!box) return;
  box.innerHTML = `<div class="portal-row"><span>Full name</span><strong>${esc(p.full_name || '')}</strong></div>
  <div class="portal-row"><span>Email</span><strong>${esc(p.email || '')}</strong></div>
  <div class="portal-row"><span>WhatsApp</span><strong>${esc(p.phone || 'Not provided')}</strong></div>
  <div class="portal-row"><span>Country</span><strong>${esc(p.country || 'Not provided')}</strong></div>
  <div class="portal-row"><span>Programme</span><strong>${esc(p.programme || 'Not confirmed')}</strong></div>`;
}

async function dashboard() {
  if (!$('dashboard')) return;
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.replace(loginUrl());
    return;
  }

  try {
    const p = await ensureProfile(session.user);
    $('studentName').textContent = p.full_name || 'Student';
    $('studentEmail').textContent = p.email || session.user.email || '';
    $('studentProgramme').textContent = p.programme || 'Programme to be confirmed';
    renderProfile(p);
    $('dashboard').hidden = false;

    await Promise.all([
      loadClasses(),
      loadAttendance(session.user.id),
      loadProgress(session.user.id)
    ]);

    const n = $('topNotification');
    if (n) n.hidden = false;
    $('notificationText').textContent = `Assalamu Alaikum, ${p.full_name || 'Student'}! Your student dashboard is ready.`;
  } catch (err) {
    console.error(err);
    $('dashboardError').hidden = false;
    $('dashboardErrorText').textContent = err.message || 'Please return to the login page and try again.';
  }
}

$('closeNotification')?.addEventListener('click', () => { $('topNotification').hidden = true; });
$('logoutBtn')?.addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  window.location.replace(new URL('index.html', window.location.href).href);
});

dashboard();
