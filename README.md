# Al-Qutūfud Daaniyah Online Quranic Academy

This version adds a Supabase-powered student portal foundation:
- Student registration with email/password
- Student login/logout
- Student profile creation
- Upcoming class schedule area
- Zoom "Join Class" buttons

Important: the website uses a Supabase **publishable** key only. Never put a secret/service-role key in browser code.

## Database setup
Run the SQL supplied in the ChatGPT conversation to create the `students` table. Then run the class-table SQL supplied next to enable Zoom schedules.

## GitHub Pages
Upload/replace the website files in the GitHub repository. The site remains a static GitHub Pages site; Supabase provides authentication and database services.


## Free web images added
The public homepage now uses free-to-use Pexels images for the online-learning visuals:
- Teacher/student online class: https://www.pexels.com/photo/a-teacher-talking-to-her-student-using-a-laptop-5212657/
- Student listening to online class: https://www.pexels.com/photo/clever-black-boy-taking-notes-and-listening-teacher-online-5905704/

The existing `logo.png` was not changed.
