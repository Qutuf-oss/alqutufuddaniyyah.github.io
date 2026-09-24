const menuBtn=document.querySelector('.menu-btn');
const nav=document.querySelector('#nav');
menuBtn?.addEventListener('click',()=>nav?.classList.toggle('open'));
document.querySelectorAll('nav a').forEach(a=>a.addEventListener('click',()=>nav?.classList.remove('open')));
const year=document.getElementById('year'); if(year) year.textContent=new Date().getFullYear();
const applicationForm=document.getElementById('applicationForm');
applicationForm?.addEventListener('submit',function(e){
 e.preventDefault(); const data=new FormData(this);
 const message=`Assalamu Alaikum. I would like to apply to Al-Qutūfud Daaniyah Online Quranic Academy.\n\nStudent's full name: ${data.get('student')}\nAge: ${data.get('age')}\nParent/Guardian: ${data.get('guardian')||'N/A'}\nEmail: ${data.get('email')||'N/A'}\nCountry: ${data.get('country')}\nWhatsApp number: ${data.get('phone')}\nProgramme: ${data.get('programme')}\nClass type: ${data.get('classType')}\nPreferred days/time: ${data.get('schedule')||'Not specified'}\nLearner's level/goals: ${data.get('message')||'Not specified'}\n\nPlease let me know the next steps. Jazakumullahu khayran.`;
 window.open('https://wa.me/2349036050675?text='+encodeURIComponent(message),'_blank');
});
