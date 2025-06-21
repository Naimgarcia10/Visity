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
      switchMap(() => {
        // Actualizar los contadores en los documentos de usuario
        return this.updateFollowCounts(followerUsername, followedUsername, 1);
      }),
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
      switchMap(() => {
        // Actualizar los contadores en los documentos de usuario (restar)
        return this.updateFollowCounts(followerUsername, followedUsername, -1);
      }),
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

  /**
   * Actualiza los contadores de following y followers en los documentos de usuario
   * @param followerUsername Usuario que sigue
   * @param followedUsername Usuario que es seguido
   * @param incrementValue Valor de incremento (1 para seguir, -1 para dejar de seguir)
   */
  private updateFollowCounts(followerUsername: string, followedUsername: string, incrementValue: number): Observable<any> {
    // Primero necesitamos obtener los IDs de documento de los usuarios por su username
    return this.getUserIdByUsername(followerUsername).pipe(
      switchMap(followerId => {
        if (!followerId) throw new Error(`Usuario ${followerUsername} no encontrado`);
        
        return this.getUserIdByUsername(followedUsername).pipe(
          switchMap(followedId => {
            if (!followedId) throw new Error(`Usuario ${followedUsername} no encontrado`);
            
            const followerRef = doc(this.firestore, `users/${followerId}`);
            const followedRef = doc(this.firestore, `users/${followedId}`);
            
            const updateFollower = updateDoc(followerRef, { followingCount: increment(incrementValue) });
            const updateFollowed = updateDoc(followedRef, { followersCount: increment(incrementValue) });
            
            return from(Promise.all([updateFollower, updateFollowed]));
          })
        );
      })
    );
  }

  
  /**
   * Obtiene el ID de usuario correspondiente a un nombre de usuario dado.
   *
   * @param username - El nombre de usuario del cual se desea obtener el ID.
   * @returns Un observable que emite el ID del usuario como una cadena, o `null` si no se encuentra el usuario.
   * 
   * @remarks
   * Este método consulta la colección de usuarios en Firestore para buscar un documento
   * cuyo campo `username` coincida con el nombre de usuario proporcionado. Si no se encuentra
   * ningún usuario, el observable emitirá `null`. En caso de error durante la consulta, se
   * captura el error y el observable también emitirá `null`.
   * 
   * @example
   * ```typescript
   * followService.getUserIdByUsername('naim123').subscribe(userId => {
   *   if (userId) {
   *     console.log(`El ID del usuario es: ${userId}`);
   *   } else {
   *     console.log('Usuario no encontrado');
   *   }
   * });
   * ```
   */
  private getUserIdByUsername(username: string): Observable<string | null> {
    const usersRef = collection(this.firestore, 'users');
    const q = query(usersRef, where('username', '==', username));
    
    return from(getDocs(q)).pipe(
      map(snapshot => {
        if (snapshot.empty) return null;
        return snapshot.docs[0].id;
      }),
      catchError(error => {
        console.error(`Error al buscar usuario ${username}:`, error);
        return of(null);
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
