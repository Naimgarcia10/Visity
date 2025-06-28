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
  updateDoc,
  limit
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { Post } from '../models/post.model';

interface TagFrequencies {
  travelType: Record<string, number>;
  budget: Record<string, number>;
  weather: Record<string, number>;
}

@Injectable({
  providedIn: 'root'
})
export class PostService {
  private firestore: Firestore = inject(Firestore);
  private auth: Auth = inject(Auth);
  private ngZone: NgZone = inject(NgZone); // ✅ Inyectamos NgZone

  /**
   * Crea un nuevo post en Firestore
   */
  /* async createPost(
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
  } */

    async createPost(
      content: string,
      imageURLs: string[],
      itineraryURL: string,
      travelType: string[],
      budget: string,
      weather: string
    ): Promise<string> {
      try {
        const currentUser = this.auth.currentUser;
        if (!currentUser) throw new Error('Usuario no autenticado');

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

  /**
 * Obtiene los posts más populares según el tipo de viaje preferido.
 * @param travelType Tipo de viaje preferido (ej: "Cultural")
 * @param limitResults Número máximo de resultados a devolver (por defecto 10)
 * @returns Lista de posts populares
 */
  async getPopularPostsByPreferredTravelType(travelType: string): Promise<Post[]> {
    try {
      const q = query(
        collection(this.firestore, 'posts'),
        where('travelType', 'array-contains', travelType),
        orderBy('likes', 'desc'),
        limit(10) // o el número que prefieras
      );

      const snap = await getDocs(q);
      return snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];

    } catch (error) {
      console.error('Error obteniendo posts populares:', error);
      return [];
    }
  }

  /**
 * Extrae los tags más frecuentes (travelType, budget, weather) del usuario a partir de sus posts y likes.
 */
  async getUserPreferenceTags(uid: string): Promise<TagFrequencies> {
  const userPosts = await this.getPostsByUser(uid);
  if (!userPosts || userPosts.length === 0) {
    return {
      travelType: {},
      budget: {},
      weather: {}
    };
  }

  const travelTypeFreq: Record<string, number> = {};
  const budgetFreq: Record<string, number> = {};
  const weatherFreq: Record<string, number> = {};

  for (const post of userPosts) {
    post.travelType?.forEach((tag: string) => travelTypeFreq[tag] = (travelTypeFreq[tag] || 0) + 1);
    if (post.budget) budgetFreq[post.budget] = (budgetFreq[post.budget] || 0) + 1;
    if (post.weather) weatherFreq[post.weather] = (weatherFreq[post.weather] || 0) + 1;
  }

  return {
    travelType: travelTypeFreq,
    budget: budgetFreq,
    weather: weatherFreq
  };
}

/**
 * Obtiene todos los posts de un usuario por su UID
 */
async getPostsByUser(uid: string): Promise<Post[]> {
  try {
    const q = query(
      collection(this.firestore, 'posts'),
      where('authorId', '==', uid),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Post[];
  } catch (error) {
    console.error('Error obteniendo posts del usuario:', error);
    return [];
  }
}



  private addTagsToMap(allTags: any, data: any) {
    // travelType puede ser un array
    if (Array.isArray(data.travelType)) {
      data.travelType.forEach((tag: string) => {
        allTags.travelType.set(tag, (allTags.travelType.get(tag) || 0) + 1);
      });
    }

    if (typeof data.budget === 'string') {
      allTags.budget.set(data.budget, (allTags.budget.get(data.budget) || 0) + 1);
    }

    if (typeof data.weather === 'string') {
      allTags.weather.set(data.weather, (allTags.weather.get(data.weather) || 0) + 1);
    }
  }

  private getTopTags(tagMap: Map<string, number>, topN: number): string[] {
    return [...tagMap.entries()]
      .sort((a, b) => b[1] - a[1]) // ordenar por frecuencia
      .slice(0, topN)
      .map(([tag]) => tag);
  }

  /**
 * Devuelve los IDs de autores de los posts que el usuario actual ha dado like
 */
  async getAuthorsLikedByUser(userId: string): Promise<string[]> {
    const postsRef = collection(this.firestore, 'posts');
    const postsSnap = await getDocs(postsRef);
    
    const likedAuthors = new Set<string>();

    postsSnap.forEach(doc => {
      const data = doc.data();
      if (Array.isArray(data['likedBy']) && data['likedBy'].includes(userId)) {
        likedAuthors.add(data['authorId']);
      }
    });

    return Array.from(likedAuthors);
  }
}
