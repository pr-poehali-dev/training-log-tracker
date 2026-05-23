export interface Student {
  id: string;
  name: string;
  hall: string;
  grp: string;
  phone: string;
  iko: string;
  fee: number;
  lvl: string;
  cert: boolean;
  ci: string;
  ce: string;
}

export interface Attendance {
  sid: string;
  date: string;
  present: boolean;
}

export interface Payment {
  sid: string;
  mon: string;
  paid: boolean;
}

export interface PersonalSession {
  id: string;
  sid: string;
  date: string;
  dur: number;
  cost: number;
  paid: boolean;
  note: string;
}

export interface Note {
  id: string;
  ttl: string;
  bod: string;
  date: string;
  tags: string;
  imp: boolean;
}
