import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Post } from '../../models/post.model';

@Component({
  selector: 'app-post',
  templateUrl: './post.component.html',
  styleUrls: ['./post.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class PostComponent implements OnInit {
  @Input() post!: Post;

  constructor() { }

  ngOnInit(): void {
    // Código de inicialización si es necesario
  }
}