import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, updateDoc, doc, getDoc, getDocs, query, where, orderBy, limit, serverTimestamp, FieldValue } from '@angular/fire/firestore';
import { FireStorageMngService } from './fire-storage-mng.service';
import { Auth } from '@angular/fire/auth';
import { Post } from '../models/post.model';


@Injectable({
  providedIn: 'root'
})
export class PostService {
  private firestore: Firestore = inject(Firestore);
  private fireStorage: FireStorageMngService = inject(FireStorageMngService);
  private auth: Auth = inject(Auth);

  /**
   * Crea un nuevo post en Firestore
   * @param content El texto del post
   * @param images Las imágenes a subir
   * @param itineraryURL URL del itinerario
   * @param travelType Tipos de viaje seleccionados
   * @param budget Presupuesto seleccionado
   * @param weather Clima seleccionado
   */
  async createPost(
    content: string,
    images: File[],
    itineraryURL: string,
    travelType: string[],
    budget: string,
    weather: string
  ): Promise<string> {
    try {
      // Verificar que el usuario está autenticado
      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        throw new Error('Usuario no autenticado');
      }

      // Subir todas las imágenes a Firebase Storage
      const imageUploadPromises = images.map(image => 
        this.fireStorage.uploadFile(image, 'posts')
      );
      
      const imageURLs = await Promise.all(imageUploadPromises);

      // Crear el objeto post
      const newPost: Post = {
        authorId: currentUser.uid,
        content: content,
        budget: budget,
        commentsCount: 0,
        createdAt: serverTimestamp() as FieldValue,
        imageURLs: imageURLs,
        itineraryURL: itineraryURL,
        likedBy: [],
        likes: 0,
        travelType: travelType,
        weather: weather
      };

      // Guardar en Firestore
      const docRef = await addDoc(collection(this.firestore, 'posts'), newPost);
      return docRef.id;
    } catch (error) {
      console.error('Error al crear el post:', error);
      throw error;
    }
  }

  /**
 * Obtiene los posts de los usuarios que sigue un usuario
 * @param currentUserId ID del usuario actual
 */
async getPostsFromFollowedUsers(currentUserId: string): Promise<Post[]> {
  try {
    const followsQuery = query(
      collection(this.firestore, 'follows'),
      where('followerId', '==', currentUserId)
    );
    const followsSnap = await getDocs(followsQuery);
    const followingIds = followsSnap.docs.map(doc => doc.data()['followingId']);

    console.log('IDs de usuarios seguidos:', followingIds);

    if (followingIds.length === 0) return [];

    // Firebase permite hasta 10 elementos en un 'in' query
    const batchedIds = [];
    while (followingIds.length) {
      batchedIds.push(followingIds.splice(0, 10));
    }

    const postPromises = batchedIds.map(batch =>
      getDocs(query(
        collection(this.firestore, 'posts'),
        where('authorId', 'in', batch),
        orderBy('createdAt', 'desc')
      ))
    );

    const querySnapshots = await Promise.all(postPromises);
    const allDocs = querySnapshots.flatMap(snapshot => snapshot.docs);

    return allDocs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }) as Post);
  } catch (error) {
    console.error('Error al obtener posts de usuarios seguidos:', error);
    throw error;
  }
}

}