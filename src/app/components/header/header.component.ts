import { Component, inject, NgZone, HostListener, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { AuthService } from '../../shared/auth.service';
import { RouterModule, Router } from '@angular/router';
import { GlobalService } from '../../shared/global.service';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit {
  global = inject(GlobalService);
  isHeaderVisible = true;
  lastScrollPosition = 0;
  scrollThreshold = 30; 
  currentUserName: string | null = null;
  currentUserProfilePic: string | null = null;
  isBrowser: boolean;

  constructor(
    private authService: AuthService,
    private router: Router,
    private ngZone: NgZone,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  async ngOnInit(): Promise<void> {
    if (this.isBrowser) {
      this.lastScrollPosition = window.scrollY;
    }

    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.currentUserName = await this.authService.getUsernameById(currentUser.uid);
      this.currentUserProfilePic = await this.authService.getProfilePicById(currentUser.uid);
    } else {
      this.currentUserName = null;
      this.currentUserProfilePic = null;
    }
  }

  @HostListener('window:scroll', ['$event'])
  onWindowScroll() {
    if (!this.isBrowser) return;

    const currentScrollPosition = window.scrollY;

    if (currentScrollPosition <= 10) {
      this.isHeaderVisible = true;
      this.lastScrollPosition = currentScrollPosition;
      return;
    }

    const scrollDifference = Math.abs(currentScrollPosition - this.lastScrollPosition);

    if (scrollDifference > this.scrollThreshold) {
      this.isHeaderVisible = currentScrollPosition < this.lastScrollPosition;
      this.lastScrollPosition = currentScrollPosition;
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
}