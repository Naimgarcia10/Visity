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
import { Firestore, collection, getDocs, query, where, doc, getDoc } from '@angular/fire/firestore';
import { UserModel } from '../models/user_model';

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
      return userCredential.user;
    } catch (error: any) {
      console.error('Error en login:', error);
      throw error;
    }
  }

  async register(email: string, password: string): Promise<User> {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      this.ngZone.run(() => this.router.navigate(['/home']));
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
    this.ngZone.run(() => {
      this.router.navigate(['/login']);
    });
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

async getUserById(userId: string): Promise<UserModel | null> {
  try {
    const userDocRef = doc(this.firestore, 'users', userId);
    const userDocSnap = await getDoc(userDocRef);
    if (!userDocSnap.exists()) throw new Error('Usuario no encontrado');
    
    const userData = userDocSnap.data();
    return { uid: userId, ...userData } as UserModel;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
}

  async getUsernameById(userId: string): Promise<string | null> {
    try {
      const userDocRef = doc(this.firestore, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);
      if (!userDocSnap.exists()) throw new Error('Usuario no encontrado');
      return userDocSnap.data()['username'] || null;
    } catch (error) {
      console.error('Error getting username by ID:', error);
      return null;
    }
  }

  async getIdByUsername(username: string): Promise<string | null> {
    try {
      const usersRef = collection(this.firestore, 'users');
      const usernameQuery = query(usersRef, where('username', '==', username));
      const querySnapshot = await getDocs(usernameQuery);
      if (querySnapshot.empty) throw new Error('Usuario no encontrado');
      return querySnapshot.docs[0].id;
    } catch (error) {
      console.error('Error getting ID by username:', error);
      return null;
    }
  }
}