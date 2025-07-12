import { Injectable, PLATFORM_ID, Inject, NgZone, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User,
  EmailAuthProvider,
  reauthenticateWithCredential
} from '@angular/fire/auth';
import { BehaviorSubject, Observable } from 'rxjs';
import { Router } from '@angular/router';
import { Firestore, collection, getDocs, query, where, doc, getDoc, deleteDoc, updateDoc } from '@angular/fire/firestore';
import { UserModel } from '../models/user_model';
import { deleteObject, ref } from 'firebase/storage';
import { FireStorageMngService } from './fire-storage-mng.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private fireStorage: FireStorageMngService = inject(FireStorageMngService);
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

  async getUserByUsername(username: string): Promise<UserModel | null> {
    try {
      const usersRef = collection(this.firestore, 'users');
      const usernameQuery = query(usersRef, where('username', '==', username));
      const querySnapshot = await getDocs(usernameQuery);
      if (querySnapshot.empty) throw new Error('Usuario no encontrado');
      
      const userDoc = querySnapshot.docs[0];
      return { uid: userDoc.id, ...userDoc.data() } as UserModel;
    } catch (error) {
      console.error('Error getting user by username:', error);
      return null;
    }
  }

  async reauthenticateUser(password: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user || !user.email) throw new Error('Usuario no autenticado o sin email');

    const credential = EmailAuthProvider.credential(user.email, password);

    try {
      await reauthenticateWithCredential(user, credential);
      console.log('✅ Reautenticación exitosa');
    } catch (error) {
      console.error('❌ Error en reautenticación:', error);
      throw error;
    }
  }

  async deleteUserAccount(password: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('No hay usuario autenticado');

    const uid = user.uid;

    try {
      await this.reauthenticateUser(password);
      // 1. Eliminar posts del usuario y sus imágenes del Storage
      const postsRef = collection(this.firestore, 'posts');
      const postsSnap = await getDocs(query(postsRef, where('authorId', '==', uid)));

      const postDeletionPromises = postsSnap.docs.map(async (postDoc) => {
        const postData = postDoc.data();
        const imageURLs: string[] = postData['imageURLs'] || [];

        // Eliminar cada imagen del Storage
        const imageDeletionPromises = imageURLs.map(async (url) => {
          try {
            const storageRef = this.fireStorage.getStorage(); 
            const decodedUrl = decodeURIComponent(new URL(url).pathname);
            const path = decodedUrl.split('/o/')[1]?.split('?')[0]; 
            const refToDelete = ref(storageRef, path);
            await deleteObject(refToDelete);
          } catch (error) {
            console.warn('No se pudo eliminar imagen del Storage:', error);
          }
        });

        await Promise.all(imageDeletionPromises);
        await deleteDoc(postDoc.ref);
      });

      // 2. Eliminar documento de usuario
      const userDocRef = doc(this.firestore, 'users', uid);

      // 3. Eliminar entradas en follows (como seguidor o seguido)
      const followsRef = collection(this.firestore, 'follows');
      const username = await this.getUsernameById(uid);

      const followsSnap = await getDocs(query(followsRef, where('followerId', '==', username)));
      const followedSnap = await getDocs(query(followsRef, where('followedId', '==', username)));
      const followDeletionPromises = [...followsSnap.docs, ...followedSnap.docs].map(doc => deleteDoc(doc.ref));

      // 4. Ejecutar todas las eliminaciones
      await Promise.all([
        ...postDeletionPromises,
        deleteDoc(userDocRef),
        ...followDeletionPromises
      ]);

      // 5. Eliminar cuenta de Firebase Auth
      await user.delete();

      console.log('✅ Cuenta eliminada completamente');
    } catch (error) {
      console.error('❌ Error al eliminar la cuenta:', error);
      throw error;
    }
  }

  async updateUserProfile(uid: string, updates: Partial<UserModel>): Promise<void> {
    const userRef = doc(this.firestore, 'users', uid);
    await updateDoc(userRef, updates);
  }

  async getProfilePicById(userId: string): Promise<string | null> {
    try {
      const userDocRef = doc(this.firestore, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);
      if (!userDocSnap.exists()) throw new Error('Usuario no encontrado');
      return userDocSnap.data()['profilePic'] || null;
    } catch (error) {
      console.error('Error getting profile pic by ID:', error);
      return null;
    }
  }

}