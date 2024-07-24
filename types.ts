// types.ts
export interface Track {
    name: string;
    url: string;
    volume: number;
    isMuted: boolean;
  }
  
  export interface Song {
    id: string;
    title: string;
    tracks: Track[];
  }
  