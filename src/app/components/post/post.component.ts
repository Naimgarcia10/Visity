import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Post } from '../../models/post.model'; 
import { AuthService } from '../../shared/auth.service';
import { PostService } from '../../shared/post.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-post',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './post.component.html',
  styleUrls: ['./post.component.css']
})
export class PostComponent {
  @Input() post!: Post;  
   @Output() liked = new EventEmitter<void>(); // ✅ Nuevo evento
  authorUsername: string | null = null;
  authorProfilePicture: string | null = null;
  currentImageIndex: number = 0;
  googleMapsUrl: string | null = null;
  postTimeAgo: string | null = null;
  currentUserId: string | null = null;
  hasLiked: boolean = false;

  // 🔽 Comentarios
  comments: any[] = [];
  commentText: string = '';
  authorNames: { [userId: string]: string } = {};


  constructor(
    private authService: AuthService,
    private postService: PostService
  ) {}

  async ngOnInit() {
    if (this.post?.authorId) {
      const authorData = await this.authService.getUserById(this.post.authorId);
      if (authorData) {
        this.authorUsername = authorData.username;
        this.authorProfilePicture = authorData.profilePic;
        this.googleMapsUrl = this.post.itineraryURL;
        this.postTimeAgo = this.getTimeAgo();
        const user = await this.authService.getCurrentUser();
        this.currentUserId = user?.uid || null;
        this.hasLiked = this.post.likedBy?.includes(this.currentUserId || '') || false;

        await this.loadComments(); // ✅ Cargar comentarios al iniciar
      }
    }
  }

  nextImage() {
    if (this.post.imageURLs && this.currentImageIndex < this.post.imageURLs.length - 1) {
      this.currentImageIndex++;
    }
  }

  prevImage() {
    if (this.currentImageIndex > 0) {
      this.currentImageIndex--;
    }
  }

  getTimeAgo(): string {
    const now = new Date();
    const postDate = this.post.createdAt.toDate();
    const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return `Hace ${diffInSeconds} segundos`;
    } else if (diffInSeconds < 3600) {
      return `Hace ${Math.floor(diffInSeconds / 60)} minutos`;
    } else if (diffInSeconds < 86400) {
      return `Hace ${Math.floor(diffInSeconds / 3600)} horas`;
    } else {
      return `Hace ${Math.floor(diffInSeconds / 86400)} días`;
    }
  }

  async toggleLike() {
    if (!this.currentUserId || !this.post.id) return;
    await this.postService.toggleLike(this.post.id, this.currentUserId);
    this.hasLiked = !this.hasLiked;
    this.post.likes += this.hasLiked ? 1 : -1;

    this.liked.emit();
  }

  // 🔽 Cargar comentarios del post
  async loadComments() {
  if (!this.post?.id) return;
  this.comments = await this.postService.getComments(this.post.id);

  // Obtener y mapear usernames
  for (const comment of this.comments) {
    const authorId = comment.authorId;
    if (!this.authorNames[authorId]) {
      const username = await this.authService.getUsernameById(authorId);
      this.authorNames[authorId] = username || 'Desconocido';
    }
  }
}


  // 🔽 Añadir un nuevo comentario
  async addComment() {
    if (!this.commentText.trim() || !this.currentUserId || !this.post?.id) return;

    await this.postService.addComment(this.post.id, this.currentUserId, this.commentText.trim());
    this.commentText = '';
    await this.loadComments(); // recargar comentarios tras añadir
  }
}