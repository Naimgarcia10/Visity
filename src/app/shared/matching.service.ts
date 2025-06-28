import { Injectable } from '@angular/core';
import { Firestore, collection, doc, getDoc, getDocs } from '@angular/fire/firestore';
import { PostService } from './post.service';

interface UserSuggestion {
  uid: string;
  username: string;
  profilePic: string;
  matchScore: number;
}

interface TagFrequencies {
  travelType: Record<string, number>;
  budget: Record<string, number>;
  weather: Record<string, number>;
}

@Injectable({ providedIn: 'root' })
export class MatchingService {
  constructor(
    private firestore: Firestore,
    private postService: PostService
  ) {}

  async getSuggestedUsers(currentUserId: string): Promise<UserSuggestion[]> {
    // 1. Obtener el preferredTravelType del usuario actual
    const userDoc = await getDoc(doc(this.firestore, 'users', currentUserId));
    if (!userDoc.exists()) return [];

    const preferredTravelType = userDoc.data()['preferredTravelType'];
    if (!preferredTravelType) return [];

    // 2. Obtener los posts de todos los usuarios
    const postsSnap = await getDocs(collection(this.firestore, 'posts'));

    // 3. Obtener autores a los que el usuario ha dado like
    const likedAuthors = await this.postService.getAuthorsLikedByUser(currentUserId);

    const scoreMap = new Map<string, number>();
    const userMeta = new Map<string, { username: string; profilePic: string }>();

    for (const postDoc of postsSnap.docs) {
      const post = postDoc.data();
      const authorId = post['authorId'];
      const travelTypes = post['travelType'] || [];
      const likedBy = post['likedBy'] || [];

      if (authorId === currentUserId) continue;

      // Guardar meta si no la teníamos
      if (!userMeta.has(authorId)) {
        const authorDoc = await getDoc(doc(this.firestore, 'users', authorId));
        if (authorDoc.exists()) {
          userMeta.set(authorId, {
            username: authorDoc.data()['username'],
            profilePic: authorDoc.data()['profilePic']
          });
        }
      }

      // +1 si el post contiene el preferredTravelType del usuario actual
      if (travelTypes.includes(preferredTravelType)) {
        scoreMap.set(authorId, (scoreMap.get(authorId) || 0) + 1);
      }

      // +2 si el usuario actual ha dado like a este post
      if (likedBy.includes(currentUserId)) {
        scoreMap.set(authorId, (scoreMap.get(authorId) || 0) + 2);
      }
    }

    // 4. Construir sugerencias
    const suggestions: UserSuggestion[] = [];
    for (const [uid, score] of scoreMap.entries()) {
      const meta = userMeta.get(uid);
      if (meta) {
        suggestions.push({
          uid,
          username: meta.username,
          profilePic: meta.profilePic,
          matchScore: score
        });
      }
    }

    // 5. Ordenar por score descendente
    return suggestions.sort((a, b) => b.matchScore - a.matchScore);
  }

}
