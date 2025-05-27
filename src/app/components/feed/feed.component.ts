import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Post } from '../../models/post.model';
import { PostService } from '../../shared/post.service';
import { AuthService } from '../../shared/auth.service';
import { PostComponent } from '../post/post.component';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-feed',
  templateUrl: './feed.component.html',
  styleUrls: ['./feed.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, PostComponent]
})
export class FeedComponent implements OnInit {
  posts: Post[] = [];
  loading: boolean = true;
  error: string | null = null;
  
  constructor(
    private postService: PostService,
    private authService: AuthService,
    private router: Router
  ) {
    console.log('FeedComponent constructor ejecutado');
  }
  
  async ngOnInit() {
  console.log('FeedComponent ngOnInit iniciado');
  try {
    this.loading = true;
    
    const currentUser = this.authService.getCurrentUser();
    
    // Verificar si hay un usuario antes de intentar acceder a sus propiedades
    if (!currentUser) {
      console.error('No hay usuario autenticado');
      this.error = 'Debes iniciar sesión para ver el feed';
      this.router.navigate(['/login']);
      return;
    }
    
    console.log('Obteniendo posts para usuario:', currentUser.uid);
    
    // Resto del código...
    const followedPosts = await this.postService.getPostsFromFollowedUsers(currentUser.uid);
    
    console.log('Posts obtenidos:', followedPosts.length);
    
    // Ordenar por fecha descendente
    this.posts = followedPosts.sort((a, b) => {
      const aDate = a.createdAt?.toMillis?.() || 0;
      const bDate = b.createdAt?.toMillis?.() || 0;
      return bDate - aDate;
    });
  } catch (error) {
    console.error('Error en ngOnInit:', error);
    this.error = 'Error al cargar el feed';
  } finally {
    this.loading = false;
    console.log('FeedComponent ngOnInit completado');
  }
}

  logout() {
    this.authService.logout().then(() => {
      console.log('Usuario desconectado');
      this.router.navigate(['/login']);
    }).catch((error) => {
      console.error('Error al cerrar sesión:', error);
    });

  }
}
