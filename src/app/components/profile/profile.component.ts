import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../shared/auth.service';
import { UserModel } from '../../models/user_model';
import { FollowService } from '../../shared/follow.service';
import { PostService } from '../../shared/post.service';
import { HeaderComponent } from "../header/header.component";
import { Post } from '../../models/post.model';
import { PostComponent } from "../post/post.component";
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, HeaderComponent, PostComponent, FormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  user: UserModel | null = null;
  followersCount = 0;
  followingCount = 0;
  postCount = 0;
  userPosts: Post[] = [];
  passwordToConfirm: string = '';
  deletionError: string = '';
  showDeleteForm: boolean = false;
  showEditForm = false;
  editForm = {
    fullname: '',
    birthdate: '',
    preferredTravelType: '',
    username: ''
  };
  editError = '';
  editSuccess = '';
  travelTypes = ['Mochilero', 'Aventura', 'Cultural', 'Gastronómico'];
  currentUserId: string = '';
  isOwnProfile = false;
  isFollowing: boolean | null = null;
  currentUsername: string = '';
  hoveringFollowBtn: boolean = false;
  private routeSub!: Subscription;
  usernameParam: string = '';


  constructor(
    private postService: PostService,
    private authService: AuthService,
    private followService: FollowService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(() => {
      this.loadProfileFromRoute();
    });
  }


  async loadProfileFromRoute(): Promise<void> {
    const routeUsername = this.route.snapshot.paramMap.get('username');
    const currentUser = await this.authService.getCurrentUser();
    if (!currentUser) return;

    this.currentUserId = currentUser.uid;

    // Obtener datos del perfil cargado
    this.user = routeUsername
      ? await this.authService.getUserByUsername(routeUsername)
      : await this.authService.getUserById(this.currentUserId);

    if (!this.user) return;

    this.isOwnProfile = this.user.uid === this.currentUserId;

    if (this.user.username) {
      this.followService.getFollowers(this.user.username).subscribe(f => this.followersCount = f.length);
      this.followService.getFollowing(this.user.username).subscribe(f => this.followingCount = f.length);
    }

    const posts = await this.postService.getPostsByUser(this.user.uid);
    this.userPosts = posts;
    this.postCount = posts.length;

    // Rellenar formulario si es su perfil
    if (this.isOwnProfile) {
      this.editForm.fullname = this.user.fullname;
      this.editForm.username = this.user.username;
      this.editForm.birthdate = this.user.birthdate || '';
      this.editForm.preferredTravelType = this.user.preferredTravelType || '';
    }

    // Cargar estado de seguimiento si no es su perfil
    if (!this.isOwnProfile) {
      this.currentUsername = (await this.authService.getUserById(this.currentUserId))?.username || '';
      if (this.user.username) {
        this.followService
          .isFollowing(this.currentUsername, this.user.username)
          .subscribe(res => this.isFollowing = res);
      }
    }
  }

  toggleFollow() {
    if (!this.currentUsername || !this.user?.username) return;

    const usernameToFollow = this.user.username;

    if (this.isFollowing) {
      this.followService.unfollowUserByUsername(this.currentUsername, usernameToFollow).subscribe({
        next: () => {
          this.isFollowing = false;
          this.refreshFollowerCount();
        },
        error: err => console.error('Error al dejar de seguir:', err)
      });
    } else {
      this.followService.followUserByUsername(this.currentUsername, usernameToFollow).subscribe({
        next: () => {
          this.isFollowing = true;
          this.refreshFollowerCount();
        },
        error: err => console.error('Error al seguir:', err)
      });
    }
  }

  private refreshFollowerCount(): void {
    if (this.user?.username) {
      this.followService.getFollowers(this.user.username).subscribe(f => {
        this.followersCount = f.length;
      });
    }
  }

  toggleDeleteForm() {
    this.showDeleteForm = !this.showDeleteForm;
    this.deletionError = '';
    this.passwordToConfirm = '';

    // Ocultar el formulario de edición si está abierto
    if (this.showDeleteForm) {
      this.showEditForm = false;
      this.editError = '';
      this.editSuccess = '';
    }
  }

  async onDeleteAccount(): Promise<void> {
    try {
      if (!this.passwordToConfirm) {
        this.deletionError = 'Debes introducir tu contraseña.';
        return;
      }

      await this.authService.deleteUserAccount(this.passwordToConfirm);
      alert('Cuenta eliminada correctamente.');
      this.router.navigate(['/login']);
    } catch (error) {
      this.deletionError = 'Contraseña incorrecta o error al eliminar la cuenta.';
    }
  }

  toggleEditProfile() {
    this.showEditForm = !this.showEditForm;
    this.editError = '';
    this.editSuccess = '';

    // Ocultar el formulario de eliminación si está abierto
    if (this.showEditForm) {
      this.showDeleteForm = false;
      this.deletionError = '';
      this.passwordToConfirm = '';
    }

    if (this.user && this.showEditForm) {
      this.editForm.fullname = this.user.fullname;
      this.editForm.username = this.user.username || '';
      this.editForm.birthdate = this.user.birthdate || '';
      this.editForm.preferredTravelType = this.user.preferredTravelType || '';
    }
  }

  async saveProfileChanges() {
    if (!this.user) return;
    try {
      const updates = {
        fullname: this.editForm.fullname,
        username: this.editForm.username.trim().toLowerCase(),
        birthdate: this.editForm.birthdate,
        preferredTravelType: this.editForm.preferredTravelType
      };
      await this.authService.updateUserProfile(this.user.uid, updates);
      this.editSuccess = 'Perfil actualizado correctamente.';
      this.editError = '';
      this.showEditForm = false;

      // Refrescar datos en vista
      this.user = await this.authService.getUserById(this.user.uid);
    } catch (error) {
      console.error(error);
      this.editError = 'Error al guardar los cambios.';
      this.editSuccess = '';
    }
  }

  onPostDeleted(postId: string) {
    this.userPosts = this.userPosts.filter(post => post.id !== postId);
    this.postCount = this.userPosts.length;
  }

}
