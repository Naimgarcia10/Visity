import { Component, OnInit, NgZone, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { PostComponent } from '../post/post.component';
import { PostService } from '../../shared/post.service';
import { AuthService } from '../../shared/auth.service';
import { Post } from '../../models/post.model';
import { FollowService } from '../../shared/follow.service';
import { GlobalService } from '../../shared/global.service'; 

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [CommonModule, RouterModule, PostComponent],
  templateUrl: './feed.component.html',
  styleUrls: ['./feed.component.css']
})
export class FeedComponent implements OnInit {
  posts: Post[] = [];
  global  = inject(GlobalService);

  constructor(
    private postService: PostService,
    private followService: FollowService,
    private authService: AuthService,
    private router: Router,
    private ngZone: NgZone
  ) {}

  async ngOnInit() {
    const user = this.authService.getCurrentUser();

    if (!user) {
      console.warn('Usuario no autenticado');
      this.ngZone.run(() => {
        this.router.navigate(['/login']);
      });
      return;
    }

    try {
      const posts = await this.postService.getPosts(user.uid);
      this.ngZone.run(() => {
        this.posts = posts;
      });
    } catch (error) {
      console.error('Error cargando feed:', error);
    }
  }

  logout() {
    this.authService.logout().then(() => {
      this.ngZone.run(() => {
        console.log('Usuario desconectado');
        this.router.navigate(['/login']);
      });
    }).catch(error => {
      console.error('Error al cerrar sesión:', error);
    });
  }

  async followUser() {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      console.warn('Usuario no autenticado');
      return;
    }

    const currentUsername = await this.authService.getUsernameById(currentUser.uid);
    if (!currentUsername) {
      console.warn('No se pudo obtener el nombre de usuario del usuario actual');
      return;
    }

    const followedUsername = 'santi10'; 

    this.followService.followUserByUsername(currentUsername, followedUsername)
      .subscribe({
        next: () => {
          console.log(`Ahora sigues a ${followedUsername}`);
        },
        error: (error) => {
          console.error('Error al seguir al usuario:', error);
        }
      });
  }

}
