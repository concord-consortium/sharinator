import { PublishResponse, LaunchApplication, Representation } from 'cc-sharing'

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
  snapshotMap: SnapshotUserInteractiveMap
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

export interface FirebaseSavedSnapshotGroup {
  id: number,
  members: FirebaseGroupUserMap
}

export interface FirebaseSavedSnapshot {
  createdAt: number
  user: string
  group: FirebaseSavedSnapshotGroup|null
  snapshot: PublishResponse
}

export interface FirebaseDataContextRefMap {
  [s: string]: string
}

export interface FirebaseDataContextPathMap {
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
  snapshots: FirebaseSavedSnapshotMapMap
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
export interface FirebaseSavedSnapshotMap {
  [s: string]: FirebaseSavedSnapshot
}
export interface FirebaseSavedSnapshotMapMap {
  [s: string]: FirebaseSavedSnapshotMap
}
export interface FirebaseSnapshotSnapshots {
  val: () => FirebaseSavedSnapshotMap
}
export interface FirebaseDisconnect {
  set: (vals:any) => any
}
export interface FirebaseRef {
  on: (attr: string, callback: (snapshot:FirebaseSnapshot|FirebaseGroupSnapshot|FirebaseSnapshotSnapshots) => void) => void,
  off: () => void
  set: (vals: any) => void
  onDisconnect: () => FirebaseDisconnect
  push: () => any
}

export type SnapshotUserInteractive = SnapshotApplicationUserInteractive | SnapshotRepresentationUserInteractive
export interface SnapshotApplicationUserInteractive {
  type: "application"
  savedSnapshot: FirebaseSavedSnapshot
  userInteractive: UserInteractive
  user: User
  application: LaunchApplication
}
export interface SnapshotRepresentationUserInteractive {
  type: "representation"
  savedSnapshot: FirebaseSavedSnapshot
  userInteractive: UserInteractive
  user: User
  representation: Representation
}


export interface SnapshotUserInteractiveMap {
  [s: string]: SnapshotUserInteractive
}

export type InteractiveState = any // TODO
export type GlobalInteractiveState = any // TODO
export type LinkedState = any // TODO



export type Window = any