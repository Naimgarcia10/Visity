import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, updateDoc, doc, getDoc, getDocs, query, where, orderBy, limit, serverTimestamp, FieldValue } from '@angular/fire/firestore';
import { FireStorageMngService } from './fire-storage-mng.service';
import { Auth } from '@angular/fire/auth';

export interface Post {
  authorId: string;
  createdAt: Date | string | FieldValue;
  content: string;
  imageURLs: string[];
  itineraryURL: string;
  travelType: string[];
  budget: string;
  weather: string;
  likes: number;
  likedBy: string[];
  commentsCount: number;
}

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
        createdAt: serverTimestamp(),
        content: content,
        imageURLs: imageURLs,
        itineraryURL: itineraryURL,
        travelType: travelType,
        budget: budget,
        weather: weather,
        likes: 0,
        likedBy: [],
        commentsCount: 0
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
   * Actualiza los likes de un post
   * @param postId ID del post
   * @param userId ID del usuario que da like
   * @param isLiking true para dar like, false para quitar like
   */
  async updateLike(postId: string, userId: string, isLiking: boolean): Promise<void> {
    try {
      const postRef = doc(this.firestore, 'posts', postId);
      const postSnap = await getDoc(postRef);
      
      if (!postSnap.exists()) {
        throw new Error('Post no encontrado');
      }
      
      const postData = postSnap.data() as Post;
      let likedBy = [...(postData.likedBy || [])];
      
      if (isLiking && !likedBy.includes(userId)) {
        likedBy.push(userId);
      } else if (!isLiking && likedBy.includes(userId)) {
        likedBy = likedBy.filter(id => id !== userId);
      }
      
      await updateDoc(postRef, {
        likes: likedBy.length,
        likedBy: likedBy
      });
    } catch (error) {
      console.error('Error al actualizar like:', error);
      throw error;
    }
  }

  /**
   * Incrementa el contador de comentarios de un post
   * @param postId ID del post
   */
  async incrementCommentCount(postId: string): Promise<void> {
    try {
      const postRef = doc(this.firestore, 'posts', postId);
      const postSnap = await getDoc(postRef);
      
      if (!postSnap.exists()) {
        throw new Error('Post no encontrado');
      }
      
      const postData = postSnap.data() as Post;
      const newCount = (postData.commentsCount || 0) + 1;
      
      await updateDoc(postRef, {
        commentsCount: newCount
      });
    } catch (error) {
      console.error('Error al incrementar comentarios:', error);
      throw error;
    }
  }

  /**
   * Obtiene los posts más recientes
   * @param limit Número de posts a obtener
   */
  async getRecentPosts(limitCount: number = 10) {
    try {
      const postsQuery = query(
        collection(this.firestore, 'posts'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(postsQuery);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error al obtener posts:', error);
      throw error;
    }
  }

  /**
   * Obtiene los posts de un usuario específico
   * @param userId ID del usuario
   */
  async getUserPosts(userId: string) {
    try {
      const postsQuery = query(
        collection(this.firestore, 'posts'),
        where('authorId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(postsQuery);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error al obtener posts del usuario:', error);
      throw error;
    }
  }
}