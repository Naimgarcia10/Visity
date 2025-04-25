import { Component } from '@angular/core';
import { CreatePostComponent } from "../create-post/create-post.component";
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [CreatePostComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  user: string = '';

  constructor(private router:Router) { }

  ngOnInit() {
    if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
      this.user = sessionStorage.getItem('user') || '';
    }

    if (!this.user) {
      console.log('No has iniciado sesión. Redirigiendo...');
      setTimeout(() => {
        this.router.navigate(['login']); // Redirige a la página de inicio de sesión 
      }, 3000);
    }
  }
}
