const menuBtn=document.querySelector('.menu-btn');const nav=document.querySelector('#nav');menuBtn?.addEventListener('click',()=>nav.classList.toggle('open'));document.querySelectorAll('nav a').forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')));document.getElementById('year').textContent=new Date().getFullYear();

document.getElementById('applicationForm').addEventListener('submit',function(e){
  e.preventDefault();
  const data=new FormData(this);
  const message=`Assalamu Alaikum. I would like to apply to Al-Qutūfud Daaniyah Online Quranic Academy.

Student's full name: ${data.get('student')}
Age: ${data.get('age')}
Parent/Guardian: ${data.get('guardian')||'N/A'}
Email: ${data.get('email')||'N/A'}
Country: ${data.get('country')}
WhatsApp number: ${data.get('phone')}
Programme: ${data.get('programme')}
Class type: ${data.get('classType')}
Preferred days/time: ${data.get('schedule')||'Not specified'}
Learner's level/goals: ${data.get('message')||'Not specified'}

Please let me know the next steps. Jazakumullahu khayran.`;
  window.open('https://wa.me/2349036050675?text='+encodeURIComponent(message),'_blank');
});
