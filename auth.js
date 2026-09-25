const { createClient } = window.supabase;

const supabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

const $ = id => document.getElementById(id);

const dashboardUrl = () =>
  new URL('student-dashboard.html', window.location.href).href;

const loginUrl = () =>
  new URL('student-login.html', window.location.href).href;

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

async function ensureProfile(user) {
  const { data, error } = await supabaseClient
    .from('students')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw error;

  if (data) return data;

  const m = user.user_metadata || {};

  const profile = {
    id: user.id,
    full_name:
      m.full_name ||
      user.email?.split('@')[0] ||
      'Student',
    email: user.email || '',
    phone: m.phone || '',
    country: m.country || '',
    programme: m.programme || ''
  };

  const res = await supabaseClient
    .from('students')
    .insert(profile)
    .select()
    .single();

  if (res.error) throw res.error;

  return res.data;
}


/* =========================
   STUDENT LOGIN
========================= */

const loginForm = $('loginForm');

if (loginForm) {
  loginForm.addEventListener('submit', async e => {
    e.preventDefault();

    const form = e.currentTarget;
    const btn = $('loginBtn');

    const fd = new FormData(form);

    const email = String(fd.get('email') || '').trim();
    const password = String(fd.get('password') || '');

    message('Signing you in…', true);
    busy(btn, true, 'Checking account…');

    try {
      const { data, error } =
        await supabaseClient.auth.signInWithPassword({
          email,
          password
        });

      if (error) throw error;

      if (!data.session) {
        throw new Error(
          'Login succeeded but a secure session was not returned. Please try again.'
        );
      }

      window.location.replace(dashboardUrl());

    } catch (err) {
      console.error(err);

      message(
        err.message ||
        'Unable to log in. Please check your email and password.'
      );

    } finally {
      busy(btn, false);
    }
  });
}


/* =========================
   STUDENT REGISTRATION
========================= */

const registerForm = $('registerForm');

if (registerForm) {
  registerForm.addEventListener('submit', async e => {
    e.preventDefault();

    /*
      IMPORTANT:
      Save the form in a variable BEFORE the await.
      This fixes:
      "Cannot read properties of null (reading 'reset')"
    */
    const form = e.currentTarget;

    const btn = $('registerBtn');

    const fd = new FormData(form);

    const email = String(fd.get('email') || '').trim();
    const password = String(fd.get('password') || '');

    if (password.length < 6) {
      message('Please use a password of at least 6 characters.');
      return;
    }

    message('Creating your student account…', true);
    busy(btn, true, 'Creating account…');

    try {
      const { data, error } =

/* =========================
   LOAD STUDENT CLASSES
========================= */

async function loadClasses() {

  const list = $('classesList');

  if (!list) return;

  list.innerHTML =
    '<p class="muted">Loading classes…</p>';

  const { data, error } =
    await supabaseClient
      .from('classes')
      .select(
        'id,title,programme,start_time,duration_minutes,zoom_link,tutor'
      )
      .order('start_time', {
        ascending: true
      });

  if (error) {

    console.error(error);

    list.innerHTML = `
      <div class="empty-card">
        <strong>Classes could not be loaded.</strong>
        <p>
          Please check your connection or ask the academy
          to review the class schedule.
        </p>
      </div>
    `;

    return;
  }

  if (!
