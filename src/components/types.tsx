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
  _firstName: string
  _lastName: string
  fullname: string
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

export interface FirebaseGroupUser {
  active: boolean
}

export interface FirebaseGroupUserMap {
  [email: string]: FirebaseGroupUser
}

export interface FirebaseGroup {
  users: FirebaseGroupUserMap
}

export interface FirebaseGroupMap {
  [id: number]: FirebaseGroup
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

export interface MyClassListResponse {
  classes: ClassListItem[]
}
export interface ClassListItem {
  uri: string
  name: string
  class_hash: string
}

export type SuperagentError = any  // TODO
export type SuperagentResponse = any  // TODO

export type Firebase = any // TODO
export type IFramePhone = any // TODO

export interface FirebaseGroupSnapshot {
  val: () => FirebaseGroupMap
}

export interface FirebaseSnapshot {
  val: () => FirebaseData
}
export interface FirebaseDisconnect {
  set: (vals:any) => any
}
export interface FirebaseRef {
  on: (attr: string, callback: (snapshot:FirebaseSnapshot|FirebaseGroupSnapshot) => void) => void,
  off: () => void
  set: (vals: any) => void
  onDisconnect: () => FirebaseDisconnect
}

export type InteractiveState = any // TODO
export type GlobalInteractiveState = any // TODO
export type LinkedState = any // TODO



export type Window = any