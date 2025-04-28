import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updatePassword } from '@angular/fire/auth';
import { Firestore, collection, doc, setDoc, query, where, getDocs, updateDoc, getDoc } from '@angular/fire/firestore';
import { BehaviorSubject } from 'rxjs';
import { UserModel } from '../models/user_model';
import { FireStorageMngService } from './fire-storage-mng.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<UserModel | null> = new BehaviorSubject<UserModel | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private auth: Auth, 
    private router: Router, 
    private firestore: Firestore,
    private storageMng: FireStorageMngService,
  ) { }

  logout() {
    this.auth.signOut();
    localStorage.setItem('token', 'false');
    localStorage.removeItem('user_email');
    this.currentUserSubject.next(null);
    this.router.navigate(['/']);
    localStorage.clear();
  }

  async updateProfile(userEmail: string, newData: Partial<UserModel>) {
    const usersRef = collection(this.firestore, 'users');
    const q = query(usersRef, where('email', '==', userEmail));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((document) => {
      updateDoc(doc(this.firestore, 'users', document.id), newData as { [key: string]: any });
    });
  }

  async changePassword(email: string, newPassword: string) {
    const user = this.auth.currentUser;
    if (user) {
      try {
        await updatePassword(user, newPassword);
        console.log('Contraseña cambiada exitosamente');
      } catch (error) {
        console.error('Error al cambiar la contraseña:', error);
      }
    }
  }

  async isUsernameAvailable(username: string): Promise<boolean> {
    try {
      const usersRef = collection(this.firestore, 'users');
      const usernameQuery = query(usersRef, where('username', '==', username));
      const querySnapshot = await getDocs(usernameQuery);
  
      // Si la consulta devuelve resultados, el nombre de usuario ya está en uso
      return querySnapshot.empty; // Devuelve true si no hay resultados (disponible), false si hay resultados (en uso)
    } catch (error) {
      console.error('Error checking username availability:', error);
      return false; // En caso de error, asumimos que el nombre no está disponible
    }
  }
}
