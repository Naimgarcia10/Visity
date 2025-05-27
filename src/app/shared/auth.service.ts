import { Injectable, PLATFORM_ID, Inject, NgZone } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User
} from '@angular/fire/auth';
import { BehaviorSubject, Observable } from 'rxjs';
import { Router } from '@angular/router';
import { Firestore, collection, getDocs, query, where } from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private userSubject = new BehaviorSubject<User | null>(null);
  user$: Observable<User | null> = this.userSubject.asObservable();
  private isBrowser: boolean;

  constructor(
    private auth: Auth,
    private router: Router,
    private firestore: Firestore,
    private ngZone: NgZone,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  isAuthenticated(): boolean {
    if (this.auth.currentUser) return true;
    if (this.isBrowser) return sessionStorage.getItem('user') !== null;
    return false;
  }

  getCurrentUser(): User | null {
    if (this.auth.currentUser) return this.auth.currentUser;
    if (this.isBrowser) {
      const user = sessionStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    }
    return null;
  }

  async login(email: string, password: string): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      this.router.navigate(['/home']);
      return userCredential.user;
    } catch (error: any) {
      console.error('Error en login:', error);
      throw error;
    }
  }

  async register(email: string, password: string): Promise<User> {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      this.router.navigate(['/home']);
      return userCredential.user;
    } catch (error: any) {
      console.error('Error en registro:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
      if (this.isBrowser) {
        sessionStorage.removeItem('user');
      }
      this.router.navigate(['/login']);
    } catch (error: any) {
      console.error('Error en logout:', error);
      throw error;
    }
  }

  async isUsernameAvailable(username: string): Promise<boolean> {
    try {
      const usersRef = collection(this.firestore, 'users');
      const usernameQuery = query(usersRef, where('username', '==', username));
      const querySnapshot = await getDocs(usernameQuery);
      return querySnapshot.empty;
    } catch (error) {
      console.error('Error checking username availability:', error);
      return false;
    }
  }
}