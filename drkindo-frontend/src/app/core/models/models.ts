export interface User {
  id: number;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  role: 'USER' | 'ADMIN' | 'MEDIA';
}

export interface Author {
  id: number;
  name: string;
  bio?: string;
  photoUrl?: string;
  createdAt: string;
}

export interface Folder {
  id: number;
  name: string;
  path: string;
  parent?: Folder;
  children?: Folder[];
  audioCount?: number;
  videoCount?: number;
}

export type MediaStatus = 'NEW' | 'ANALYZED' | 'PUBLISHED';

export interface Media {
  id: number;
  filename: string;
  path: string;
  detectedAuthor?: string;
  contentDate?: string;
  contentYear?: number;
  contentMonth?: number;
  contentDay?: number;
  sequenceNumber?: number;
  duration?: number; // legacy seconds
  durationMs?: number;
  size: number;
  mimeType: string;
  type: 'AUDIO' | 'VIDEO';
  status: MediaStatus;
  audioBitrate?: number;
  fileHash?: string;
  folder?: Folder;
  playCount: number;
  createdAt: string;
}

export interface Post {
  id: number;
  title?: string;
  description?: string;
  media: Media;
  author: Author;
  postedBy: User;
  tags?: string[];
  transcription?: string;
  comments?: Comment[];
  likes?: Like[];
  likesCount?: number;
  liked?: boolean;
  createdAt: string;
}

export interface Comment {
  id: number;
  content: string;
  author: User;
  createdAt: string;
}

export interface Like {
  id: number;
  user: User;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  last: boolean;
  first: boolean;
  empty: boolean;
}

export interface AuthResponse {
  token: string;
  username: string;
  email: string;
  id: number;
}
