import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FollowService } from '../../shared/follow.service';
import { AuthService } from '../../shared/auth.service';

@Component({
  selector: 'app-user-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-search.component.html',
  styleUrls: ['./user-search.component.css']
})
export class UserSearchComponent implements OnInit {
  searchText: string = '';
  results: { username: string; profilePic: string; isFollowed: boolean }[] = [];
  currentUsername: string = '';

  @Output() followingChanged = new EventEmitter<void>(); 

  constructor(
    private followService: FollowService,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    const currentUser = await this.authService.getCurrentUser();
    if (currentUser) {
      const username = await this.authService.getUsernameById(currentUser.uid);
      if (username) this.currentUsername = username;
    }
  }

  async onSearchChange(query: string) {
    if (!query.trim()) {
      this.results = [];
      return;
    }

    const users = await this.followService.searchUsersByUsername(query, this.currentUsername);

    this.results = await Promise.all(
      users.map(async (user: any) => {
        const isFollowed = await this.followService.isFollowing(this.currentUsername, user.username).toPromise();
        return {
          username: user.username,
          profilePic: user.profilePic,
          isFollowed: isFollowed ?? false
        };
      })
    );
  }

  follow(username: string, user: any) {
    this.followService.followUserByUsername(this.currentUsername, username).subscribe({
      next: () => {
        user.isFollowed = true;
        this.followingChanged.emit(); // ✅ Notificar al padre
      },
      error: err => console.error('Error al seguir:', err)
    });
  }

  unfollow(username: string, user: any) {
    this.followService.unfollowUserByUsername(this.currentUsername, username).subscribe({
      next: () => {
        user.isFollowed = false;
        this.followingChanged.emit(); // ✅ Notificar al padre
      },
      error: err => console.error('Error al dejar de seguir:', err)
    });
  }
}