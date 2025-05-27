export interface Post {
  id?: string;
  authorId: string;
  content: string;
  budget: string;
  commentsCount: number;
  createdAt: any;
  imageURLs: string[];
  itineraryURL: string;
  likedBy: string[];
  likes: number;
  travelType: string[];
  weather: string;
}
