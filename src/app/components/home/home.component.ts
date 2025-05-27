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
  
}
