import { Component, OnInit, NgZone, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { PostComponent } from '../post/post.component';
import { PostService } from '../../shared/post.service';
import { AuthService } from '../../shared/auth.service';
import { Post } from '../../models/post.model';
import { UserModel } from '../../models/user_model';
import { HeaderComponent } from '../header/header.component';
import { PostFilterComponent } from '../post-filter/post-filter.component';
import { UserSearchComponent } from '../user-search/user-search.component';
import { CreatePostComponent } from '../create-post/create-post.component';
import { SuggestedUsersComponent } from "../suggested-users/suggested-users.component";
import { FollowService } from '../../shared/follow.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    PostComponent,
    HeaderComponent,
    PostFilterComponent,
    UserSearchComponent,
    CreatePostComponent,
    SuggestedUsersComponent
],
  templateUrl: './feed.component.html',
  styleUrls: ['./feed.component.css']
})
export class FeedComponent implements OnInit {
  posts: Post[] = [];
  filteredPosts: Post[] = [];
  currentFilters: { travelType: string[], budget: string[], weather: string[] } = {
  travelType: [],
  budget: [],
  weather: []
};
showCreatePostButton = false; 
coldStartPosts: Post[] = [];
isColdStart: boolean = false;
@ViewChild(SuggestedUsersComponent) suggestedUsersComp!: SuggestedUsersComponent;
@ViewChild(CreatePostComponent) createPostComp!: CreatePostComponent;



  constructor(
    private postService: PostService,
    private authService: AuthService,
    private followService: FollowService,
    private router: Router,
    private ngZone: NgZone
  ) {}

  async ngOnInit() {
    await this.refreshFeed(); 
  }

  async refreshFeed() {
  const user = await this.authService.getCurrentUser();
  if (!user) {
    console.warn('Usuario no autenticado');
    this.ngZone.run(() => this.router.navigate(['/login']));
    return;
  }

  const username = await this.authService.getUsernameById(user.uid);
  if (!username) {
    return;
  }

  try {
    const [posts, userData, followedIds] = await Promise.all([
      this.postService.getPosts(user.uid),
      this.authService.getUserById(user.uid) as Promise<UserModel>,
      firstValueFrom(this.followService.getFollowing(username))  // 👈 Aquí usas el método de follows
    ]);
    
    this.ngZone.run(async () => {
      this.posts = posts;
      const filtersActive = Object.values(this.currentFilters).some(f => f.length > 0);

      const isCold = followedIds.length === 0;

      if (isCold && userData.preferredTravelType) {
        this.isColdStart = true;
        this.coldStartPosts = await this.postService.getPopularPostsByPreferredTravelType(userData.preferredTravelType);
        this.filteredPosts = [...this.coldStartPosts];
      } else {
        this.isColdStart = false;
        this.filteredPosts = filtersActive
          ? this.applyFiltersReturn(this.currentFilters)
          : [...posts];
      }
    });
  } catch (error) {
    console.error('Error refrescando el feed:', error);
  }
}


applyFilters(filters: { travelType: string[], budget: string[], weather: string[] }) {
  this.currentFilters = filters;

  const source = this.isColdStart ? this.coldStartPosts : this.posts;

  this.filteredPosts = this.applyFiltersReturn(filters, source);
}


applyFiltersReturn(
  filters: { travelType: string[], budget: string[], weather: string[] },
  sourcePosts: Post[] = this.posts
): Post[] {
  return sourcePosts.filter(post => {
    const matchTravel = filters.travelType.length === 0 || filters.travelType.some(tag => post.travelType.includes(tag));
    const matchBudget = filters.budget.length === 0 || filters.budget.includes(post.budget);
    const matchWeather = filters.weather.length === 0 || filters.weather.includes(post.weather);
    return matchTravel && matchBudget && matchWeather;
  });
}

  closeCreatePost() {
    this.showCreatePostButton = false;
  } 

  onPostCreated() {
    this.closeCreatePost();
    this.refreshFeed(); 
  }

  onPostLiked() {
    if (this.suggestedUsersComp) {
      this.suggestedUsersComp.refreshSuggestions(); 
    }
  }

  onPostDeleted(postId: string) {
  this.posts = this.posts.filter(post => post.id !== postId);
  this.filteredPosts = this.filteredPosts.filter(post => post.id !== postId);
  }

}