const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
const $ = (id) => document.getElementById(id);
const isDashboard = Boolean($('dashboard'));

function esc(value=''){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function showPublicMessage(message,ok=false){const el=$('authMessage');if(!el)return;el.textContent=message;el.className=ok?'auth-message success':'auth-message';}
function dashboardUrl(){return new URL('student-dashboard.html',window.location.href).href;}
function homeUrl(){return new URL('index.html',window.location.href).href;}
function redirectToDashboard(){window.location.assign(dashboardUrl());}

async function ensureProfile(user){
 const {data:profile,error:profileError}=await supabaseClient.from('students').select('*').eq('id',user.id).maybeSingle();
 if(profileError) throw profileError;
 if(profile)return profile;
 const meta=user.user_metadata||{};
 const newProfile={id:user.id,full_name:meta.full_name||user.email?.split('@')[0]||'Student',email:user.email||'',phone:meta.phone||'',country:meta.country||'',programme:meta.programme||''};
 const {data,error}=await supabaseClient.from('students').insert(newProfile).select().single();
 if(error)throw error; return data;
}

async function loadClasses(){
 const list=$('classesList');if(!list)return;list.innerHTML='<p class="muted">Loading your classes…</p>';
 const {data,error}=await supabaseClient.from('classes').select('id,title,programme,start_time,duration_minutes,zoom_link,tutor').order('start_time',{ascending:true});
 if(error){console.error('Class loading error:',error);list.innerHTML='<p class="muted">Your class schedule will appear here after the academy adds classes.</p>';return;}
 if(!data?.length){list.innerHTML='<div class="empty-card"><strong>No classes scheduled yet.</strong><p>Your tutor will add your Zoom class schedule here.</p></div>';return;}
 list.innerHTML=data.map(cls=>{const date=new Date(cls.start_time);const dateText=date.toLocaleString([], {dateStyle:'medium',timeStyle:'short'});const safeLink=cls.zoom_link||'';return `<article class="class-card"><div><span class="eyebrow">${esc(cls.programme||'CLASS')}</span><h4>${esc(cls.title)}</h4><p>📅 ${esc(dateText)}${cls.duration_minutes?` · ${esc(cls.duration_minutes)} minutes`:''}</p>${cls.tutor?`<p>👨‍🏫 Tutor: ${esc(cls.tutor)}</p>`:''}</div><a class="btn primary" href="${esc(safeLink||'#')}" target="_blank" rel="noopener" ${safeLink?'':'aria-disabled="true"'}>${safeLink?'🔴 Join Zoom Class':'Zoom link pending'}</a></article>`}).join('');
}
function showNotification(title,text){const box=$('topNotification');if(!box)return;$('notificationTitle').textContent=title;$('notificationText').textContent=text;box.hidden=false;}
$('closeNotification')?.addEventListener('click',()=>{$('topNotification').hidden=true;});
$('logoutBtn')?.addEventListener('click',async()=>{await supabaseClient.auth.signOut();window.location.assign(homeUrl());});

$('registerForm')?.addEventListener('submit',async e=>{e.preventDefault();const fd=new FormData(e.currentTarget),email=String(fd.get('email')||'').trim(),password=String(fd.get('password')||'');if(password.length<6){showPublicMessage('Please use a password of at least 6 characters.');return;}showPublicMessage('Creating your student account…',true);const {data,error}=await supabaseClient.auth.signUp({email,password,options:{data:{full_name:fd.get('full_name'),phone:fd.get('phone'),country:fd.get('country'),programme:fd.get('programme')},emailRedirectTo:dashboardUrl()}});if(error){showPublicMessage(error.message);return;}e.currentTarget.reset();if(data.session){redirectToDashboard();}else{showPublicMessage('Account created. Please confirm your email, then return here to log in.',true);}});

$('loginForm')?.addEventListener('submit',async e=>{e.preventDefault();const fd=new FormData(e.currentTarget),email=String(fd.get('email')||'').trim(),password=String(fd.get('password')||'');showPublicMessage('Signing you in…',true);const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});if(error){console.error('Login error:',error);showPublicMessage(error.message);return;}if(!data.session){showPublicMessage('Login succeeded but no session was returned. Please try again.');return;}e.currentTarget.reset();redirectToDashboard();});

async function renderDashboard(session){
 const dash=$('dashboard'),err=$('dashboardError');if(!dash)return;if(!session){window.location.assign(homeUrl());return;}
 try{const profile=await ensureProfile(session.user);$('studentName').textContent=profile.full_name||'Student';$('studentEmail').textContent=profile.email||session.user.email||'';$('studentProgramme').textContent=profile.programme||'Programme to be confirmed';dash.hidden=false;await loadClasses();showNotification('Welcome back!',`Assalamu Alaikum, ${profile.full_name||'Student'}! Your student dashboard is ready.`);}
 catch(e){console.error('Dashboard error:',e);dash.hidden=true;if(err){err.hidden=false;$('dashboardErrorText').textContent='We could not load your student profile. Please check your connection and try logging in again.';}}
}

(async()=>{try{const {data:{session}}=await supabaseClient.auth.getSession();if(isDashboard)await renderDashboard(session);}catch(e){console.error('Session error:',e);if(isDashboard){$('dashboard')?.setAttribute('hidden','');$('dashboardError')?.removeAttribute('hidden');}}})();
