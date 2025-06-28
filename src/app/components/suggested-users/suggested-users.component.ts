import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatchingService } from '../../shared/matching.service';
import { AuthService } from '../../shared/auth.service';
import { FollowService } from '../../shared/follow.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-suggested-users',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './suggested-users.component.html',
  styleUrls: ['./suggested-users.component.css']
})
export class SuggestedUsersComponent implements OnInit {
  suggestions: any[] = [];
  currentUsername: string = '';
  loading = true;
  isFollowed: boolean = false;
  
  @Output() followingChanged = new EventEmitter<void>(); 

  constructor(
    private matchingService: MatchingService,
    private authService: AuthService,
    private followService: FollowService
  ) {}

  async ngOnInit() {
    const user = await this.authService.getCurrentUser();
    if (user) {
      const username = await this.authService.getUsernameById(user.uid);
      if (username) this.currentUsername = username;
      this.suggestions = await this.matchingService.getSuggestedUsers(user.uid);
    }
    this.loading = false;
    this.suggestions.forEach(user => {
      user.isFollowed = false; 
      this.followService.isFollowing(this.currentUsername, user.username).subscribe(isFollowed => {
        user.isFollowed = isFollowed; 
      });
    });


  }

  follow(username: string, user: any) {
    this.followService.followUserByUsername(this.currentUsername, username).subscribe({
      next: () => {
        user.isFollowed = true;
        this.followingChanged.emit(); 
      },
      error: err => console.error('Error al seguir:', err)
    });
  }

  unfollow(username: string, user: any) {
    this.followService.unfollowUserByUsername(this.currentUsername, username).subscribe({
      next: () => {
        user.isFollowed = false;
        this.followingChanged.emit(); 
      },
      error: err => console.error('Error al dejar de seguir:', err)
    });
  }

  async refreshSuggestions() {
    this.loading = true;
    const user = await this.authService.getCurrentUser();
    if (user) {
      this.suggestions = await this.matchingService.getSuggestedUsers(user.uid);
    }
    this.loading = false;
  }
}