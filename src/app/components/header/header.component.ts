import { Component, inject, NgZone, HostListener, OnInit } from '@angular/core';
import { AuthService } from '../../shared/auth.service';
import { RouterModule, Router } from '@angular/router';
import { GlobalService } from '../../shared/global.service';
import { CommonModule } from '@angular/common';

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
  
  constructor(
    private authService: AuthService,
    private router: Router,
    private ngZone: NgZone
  ) {}

  async ngOnInit(): Promise<void> {
    this.lastScrollPosition = window.scrollY;
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.currentUserName = await this.authService.getUsernameById(currentUser.uid);
    } else {
      this.currentUserName = null;
    }
  }

  @HostListener('window:scroll', ['$event'])
  onWindowScroll() {
    // Obtener posición actual
    const currentScrollPosition = window.scrollY;
    
    // Verificar si estamos en la parte superior
    if (currentScrollPosition <= 10) {
      this.isHeaderVisible = true;
      this.lastScrollPosition = currentScrollPosition;
      return;
    }
    
    // Verificar si el cambio de posición excede el umbral
    const scrollDifference = Math.abs(currentScrollPosition - this.lastScrollPosition);
    
    if (scrollDifference > this.scrollThreshold) {
      // Desplazamiento hacia abajo: ocultar header
      if (currentScrollPosition > this.lastScrollPosition) {
        this.isHeaderVisible = false;
      } 
      // Desplazamiento hacia arriba: mostrar header
      else {
        this.isHeaderVisible = true;
      }
      
      // Actualizar última posición
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