export interface Interactive {
  id: string
  name: string
  students: StudentMap
}

export interface InteractiveMap {
  [s: string]: Interactive
}

export interface Student {
  id: string
  name: string
  interactives: StudentInteractivesMap
}

export interface StudentMap {
  [s: string]: Student
}

export interface StudentInteractive {
  id: string
  name: string
  url: string
  createdAt: number
}

export interface StudentInteractivesMap {
  [s: string]: Array<StudentInteractive>
}

export interface FirebaseInteractive {
  name: string
}

export interface FirebaseInteractiveMap {
  [s: string]: FirebaseInteractive
}

export interface FirebaseStudent {
  interactives: FirebaseStudentInteractiveMap
}

export interface FirebaseStudentMap {
  [s: string]: FirebaseStudent
}

export interface FirebaseStudentInteractive {
  url: string
  createdAt: number
}

export interface FirebaseStudentInteractiveMap {
  [s: string]: FirebaseStudentInteractiveInstanceMap
}

export interface FirebaseStudentInteractiveInstanceMap {
  [s: string]: FirebaseStudentInteractive
}

export interface FirebaseData {
  interactives: FirebaseInteractiveMap
  students: FirebaseStudentMap
}