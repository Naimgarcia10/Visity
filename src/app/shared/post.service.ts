import { Injectable, inject, NgZone } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  FieldValue,
  arrayRemove,
  arrayUnion,
  updateDoc
} from '@angular/fire/firestore';
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
  private ngZone: NgZone = inject(NgZone); // ✅ Inyectamos NgZone

  /**
   * Crea un nuevo post en Firestore
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
      const currentUser = this.auth.currentUser;
      if (!currentUser) throw new Error('Usuario no autenticado');

      const imageUploadPromises = images.map(image =>
        this.fireStorage.uploadFile(image, 'posts')
      );
      const imageURLs = await Promise.all(imageUploadPromises);

      const newPost: Post = {
        authorId: currentUser.uid,
        content,
        budget,
        commentsCount: 0,
        createdAt: serverTimestamp() as FieldValue,
        imageURLs,
        itineraryURL,
        likedBy: [],
        likes: 0,
        travelType,
        weather
      };

      const docRef = await addDoc(collection(this.firestore, 'posts'), newPost);
      return docRef.id;
    } catch (error) {
      this.ngZone.run(() => {
        console.error('Error al crear el post:', error);
      });
      throw error;
    }
  }

  /**
   * Obtiene los posts de los usuarios que sigue el usuario actual
   * @param currentUserId ID del usuario actual
   */
  async getPosts(currentUserId: string): Promise<Post[]> {
    try {
      // 1. Obtener el username del usuario actual
      const userDocRef = doc(this.firestore, 'users', currentUserId);
      const userDocSnap = await getDoc(userDocRef);
      if (!userDocSnap.exists()) throw new Error('Usuario no encontrado');

      const currentUsername = userDocSnap.data()['username'];
      console.log('Usuario actual (username):', currentUsername);

      // 2. Consultar a quién sigue ese username
      const followsQuery = query(
        collection(this.firestore, 'follows'),
        where('followerId', '==', currentUsername)
      );
      const followsSnap = await getDocs(followsQuery);

      const followedUsernames: string[] = followsSnap.docs
        .map(doc => doc.data()['followedId'])
        .filter((username: string | undefined) => typeof username === 'string');

      // 3. Incluir el username actual en la lista de seguidos
      followedUsernames.push(currentUsername);

      // 4. Obtener los UID de esos usernames
      const userQuery = query(
        collection(this.firestore, 'users'),
        where('username', 'in', followedUsernames)
      );
      const usersSnap = await getDocs(userQuery);
      const followedUids = usersSnap.docs.map(doc => doc.id);

      if (followedUids.length === 0) return [];

      // 5. Dividir los UIDs en bloques de 10 para evitar limitaciones de Firestore
      const batchedUids: string[][] = [];
      while (followedUids.length) {
        batchedUids.push(followedUids.splice(0, 10));
      }

      // 6. Obtener los posts de los usuarios seguidos + el propio
      const postSnapshots = await Promise.all(
        batchedUids.map(batch =>
          getDocs(query(
            collection(this.firestore, 'posts'),
            where('authorId', 'in', batch),
            orderBy('createdAt', 'desc')
          ))
        )
      );

      const posts = postSnapshots.flatMap(snap => snap.docs);

      // 7. Mapear los datos a tipo Post
      return this.ngZone.run(() =>
        posts.map(doc => ({
          id: doc.id,
          ...doc.data()
        }) as Post)
      );
    } catch (error) {
      this.ngZone.run(() => {
        console.error('Error al obtener posts de usuarios seguidos:', error);
      });
      throw error;
    }
  }

  async toggleLike(postId: string, userId: string): Promise<void> {
    const postRef = doc(this.firestore, 'posts', postId);
    const postSnap = await getDoc(postRef);

    if (!postSnap.exists()) throw new Error('Post no encontrado');

    const postData = postSnap.data();
    const alreadyLiked = postData['likedBy']?.includes(userId);

    await updateDoc(postRef, {
      likedBy: alreadyLiked ? arrayRemove(userId) : arrayUnion(userId),
      likes: alreadyLiked ? (postData['likes'] || 1) - 1 : (postData['likes'] || 0) + 1
    });
  }


  async addComment(postId: string, userId: string, content: string) {
    const commentRef = collection(this.firestore, `posts/${postId}/comments`);
    await addDoc(commentRef, {
      authorId: userId,
      content,
      createdAt: serverTimestamp()
    });
  }

  async getComments(postId: string): Promise<any[]> {
    const commentsRef = collection(this.firestore, `posts/${postId}/comments`);
    const q = query(commentsRef, orderBy('createdAt', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  
}
