import { Injectable } from '@angular/core';
import { Firestore, deleteDoc, getDoc, doc, setDoc, updateDoc, increment, collection, query, where, getDocs } from '@angular/fire/firestore';
import { Observable, from, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service'; // Asegúrate de importar tu servicio de autenticación

export interface FollowResponse {
  success: boolean;
  followerId: string;
  followedId: string;
  timestamp?: Date;
}

@Injectable({ providedIn: 'root' })
export class FollowService {
  constructor(
    private firestore: Firestore,
    private authService: AuthService
  ) {}

  /**
   * Sigue a un usuario usando sus nombres de usuario
   * @param followerUsername Nombre de usuario del seguidor
   * @param followedUsername Nombre de usuario del seguido
   * @returns Observable con el resultado de la operación
   */
  followUserByUsername(followerUsername: string, followedUsername: string): Observable<FollowResponse> {
    // El ID del documento será la combinación de los nombres de usuario
    const customId = `${followerUsername}_${followedUsername}`;
    const followRef = doc(this.firestore, `follows/${customId}`);
    const timestamp = new Date();
    
    // Datos a almacenar en el documento
    const followData = {
      followerId: followerUsername,
      followedId: followedUsername,
      createdAt: timestamp
    };
    
    return from(setDoc(followRef, followData)).pipe(
      map(() => ({
        success: true,
        followerId: followerUsername,
        followedId: followedUsername,
        timestamp
      })),
      catchError(error => {
        console.error('Error al seguir usuario:', error);
        return of({
          success: false,
          followerId: followerUsername,
          followedId: followedUsername
        });
      })
    );
  }

  /**
   * Deja de seguir a un usuario usando sus nombres de usuario
   * @param followerUsername Nombre de usuario del seguidor
   * @param followedUsername Nombre de usuario del seguido
   * @returns Observable con el resultado de la operación
   */
  unfollowUserByUsername(followerUsername: string, followedUsername: string): Observable<FollowResponse> {
    const customId = `${followerUsername}_${followedUsername}`;
    const followRef = doc(this.firestore, `follows/${customId}`);
    
    return from(deleteDoc(followRef)).pipe(
      map(() => ({
        success: true,
        followerId: followerUsername,
        followedId: followedUsername
      })),
      catchError(error => {
        console.error('Error al dejar de seguir usuario:', error);
        return of({
          success: false,
          followerId: followerUsername,
          followedId: followedUsername
        });
      })
    );
  }

  /**
   * Verifica si un usuario sigue a otro
   * @param followerUsername Nombre de usuario del seguidor
   * @param followedUsername Nombre de usuario del seguido
   * @returns Observable con el resultado de la verificación
   */
  isFollowing(followerUsername: string, followedUsername: string): Observable<boolean> {
    const customId = `${followerUsername}_${followedUsername}`;
    const followRef = doc(this.firestore, `follows/${customId}`);
    
    return from(getDoc(followRef)).pipe(
      map(snapshot => snapshot.exists()),
      catchError(error => {
        console.error('Error al verificar seguimiento:', error);
        return of(false);
      })
    );
  }

  /**
   * Obtiene la lista de seguidores de un usuario
   * @param username Nombre de usuario del seguido
   * @returns Observable con la lista de seguidores
   */
  getFollowers(username: string): Observable<string[]> {
    const followsRef = collection(this.firestore, 'follows');
    const q = query(followsRef, where('followedId', '==', username));
    
    return from(getDocs(q)).pipe(
      map(snapshot => snapshot.docs.map(doc => doc.data()['followerId'] as string)),
      catchError(error => {
        console.error('Error al obtener seguidores:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene la lista de usuarios que sigue un usuario
   * @param username Nombre de usuario del seguidor
   * @returns Observable con la lista de seguidos
   */
  getFollowing(username: string): Observable<string[]> {
    const followsRef = collection(this.firestore, 'follows');
    const q = query(followsRef, where('followerId', '==', username));
    
    return from(getDocs(q)).pipe(
      map(snapshot => snapshot.docs.map(doc => doc.data()['followedId'] as string)),
      catchError(error => {
        console.error('Error al obtener seguidos:', error);
        return of([]);
      })
    );
  }

  async searchUsersByUsername(search: string, excludeUsername: string): Promise<any[]> {
    const usersRef = collection(this.firestore, 'users');
    const snapshot = await getDocs(usersRef);
    return snapshot.docs
      .map(doc => doc.data())
      .filter(user => user["username"] && user["username"] !== excludeUsername && user["username"].includes(search));
  }
}
