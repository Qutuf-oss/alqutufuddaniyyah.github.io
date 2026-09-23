const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const $ = (id) => document.getElementById(id);
const authArea = $('authArea');
const authMessage = $('authMessage');
const registerForm = $('registerForm');
const loginForm = $('loginForm');
const dashboard = $('studentDashboard');
const loggedOut = $('loggedOut');
const logoutBtn = $('logoutBtn');
const classesList = $('classesList');

function showMessage(message, ok = false) {
  authMessage.textContent = message;
  authMessage.className = ok ? 'auth-message success' : 'auth-message';
}

function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

async function ensureProfile(user) {
  const { data: profile } = await supabaseClient
    .from('students')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (profile) return profile;

  const meta = user.user_metadata || {};
  const newProfile = {
    id: user.id,
    full_name: meta.full_name || user.email?.split('@')[0] || 'Student',
    email: user.email || '',
    phone: meta.phone || '',
    country: meta.country || '',
    programme: meta.programme || ''
  };

  const { data, error } = await supabaseClient
    .from('students')
    .insert(newProfile)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function loadClasses() {
  classesList.innerHTML = '<p class="muted">Loading your classes…</p>';
  const { data, error } = await supabaseClient
    .from('classes')
    .select('id,title,programme,start_time,duration_minutes,zoom_link,tutor')
    .order('start_time', { ascending: true });

  if (error) {
    classesList.innerHTML = '<p class="muted">Your class schedule will appear here after the academy adds classes.</p>';
    return;
  }

  if (!data?.length) {
    classesList.innerHTML = '<div class="empty-card"><strong>No classes scheduled yet.</strong><p>Your tutor will add your Zoom class schedule here.</p></div>';
    return;
  }

  classesList.innerHTML = data.map(cls => {
    const date = new Date(cls.start_time);
    const dateText = date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    return `<article class="class-card">
      <div><span class="eyebrow">${esc(cls.programme || 'CLASS')}</span><h4>${esc(cls.title)}</h4>
      <p>📅 ${esc(dateText)}${cls.duration_minutes ? ` · ${esc(cls.duration_minutes)} minutes` : ''}</p>
      ${cls.tutor ? `<p>👨‍🏫 Tutor: ${esc(cls.tutor)}</p>` : ''}</div>
      <a class="btn primary" href="${esc(cls.zoom_link || '#')}" target="_blank" rel="noopener" ${cls.zoom_link ? '' : 'aria-disabled="true"'}>${cls.zoom_link ? '🔴 Join Zoom Class' : 'Zoom link pending'}</a>
    </article>`;
  }).join('');
}

async function renderSession(session) {
  if (!session) {
    loggedOut.hidden = false;
    dashboard.hidden = true;
    return;
  }

  try {
    const profile = await ensureProfile(session.user);
    $('studentName').textContent = profile.full_name || 'Student';
    $('studentEmail').textContent = profile.email || session.user.email || '';
    $('studentProgramme').textContent = profile.programme || 'Programme to be confirmed';
    loggedOut.hidden = true;
    dashboard.hidden = false;
    await loadClasses();
  } catch (error) {
    console.error(error);
    showMessage('We could not load your student profile. Please try again.', false);
  }
}

registerForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(registerForm);
  const email = fd.get('email').trim();
  const password = fd.get('password');

  if (password.length < 6) {
    showMessage('Please use a password of at least 6 characters.');
    return;
  }

  showMessage('Creating your student account…', true);
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fd.get('full_name'),
        phone: fd.get('phone'),
        country: fd.get('country'),
        programme: fd.get('programme')
      },
      emailRedirectTo: window.location.origin + window.location.pathname
    }
  });

  if (error) {
    showMessage(error.message);
    return;
  }

  registerForm.reset();
  if (data.session) {
    showMessage('Account created successfully. Welcome to the academy!', true);
    await renderSession(data.session);
  } else {
    showMessage('Account created. Please check your email and confirm your account, then log in.', true);
  }
});

loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(loginForm);
  showMessage('Signing you in…', true);
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: fd.get('email').trim(),
    password: fd.get('password')
  });
  if (error) {
    showMessage(error.message);
    return;
  }
  loginForm.reset();
  showMessage('Login successful.', true);
  await renderSession(data.session);
});

logoutBtn?.addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  showMessage('You have been logged out.', true);
  await renderSession(null);
});

supabaseClient.auth.onAuthStateChange((_event, session) => {
  // Defer profile/database work so auth state changes remain responsive.
  setTimeout(() => renderSession(session), 0);
});

(async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  await renderSession(session);
})();
