export interface Interactive {
  id: string
  name: string
  users: UserMap
}

export interface InteractiveMap {
  [s: string]: Interactive
}

export interface Activity {
  user: User
  userInteractive: UserInteractive
}

export interface UserName {
  firstName: string
  lastName: string
}

export interface User {
  id: string
  name: UserName
  interactives: UserInteractivesMap
}

export interface UserMap {
  [s: string]: User
}

export interface UserInteractive {
  id: string
  name: string
  url: string
  createdAt: number
}

export interface UserInteractivesMap {
  [s: string]: Array<UserInteractive>
}

export interface FirebaseInteractive {
  name: string
}

export interface FirebaseInteractiveMap {
  [s: string]: FirebaseInteractive
}

export interface FirebaseUser {
  interactives: FirebaseUserInteractiveMap
}

export interface FirebaseUserMap {
  [s: string]: FirebaseUser
}

export interface FirebaseDataContext {
  dataContext: string
  name: string
  title: string
}

export interface FirebaseDataContextRefMap {
  [s: string]: string
}

export interface FirebaseUserInteractive {
  createdAt: number
  documentUrl: string
  dataContexts: FirebaseDataContextRefMap
}

export interface FirebaseUserInteractiveMap {
  [s: string]: FirebaseUserInteractiveInstanceMap
}

export interface FirebaseUserInteractiveInstanceMap {
  [s: string]: FirebaseUserInteractive
}

export interface FirebaseData {
  interactives: FirebaseInteractiveMap
  users: FirebaseUserMap
}

export type SuperagentError = any
export type SuperagentResponse = any

