import { Component } from '@angular/core';
import { CreatePostComponent } from "../create-post/create-post.component";
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [CreatePostComponent, RouterModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  user: string = '';

  constructor() { }
  
}
