import {Firebase} from "./types"
import escapeFirebaseKey from "./escape-firebase-key"
declare var firebase: Firebase

export function classroomKey(authDomain:string, classHash:string) {
  return `${authDomain}/classes/${classHash}`
}

export function interactiveKey(authDomain:string, classHash:string, interactiveId:number) {
  return `${classroomKey(authDomain, classHash)}/interactives/interactive_${interactiveId}`
}

export function userInteractivesKey(authDomain:string, classHash:string, interactiveId:number, email:string) {
  return `${classroomKey(authDomain, classHash)}/users/${escapeFirebaseKey(email)}/interactives/interactive_${interactiveId}`
}

export function userDataContextsKey(authDomain:string, classHash:string, interactiveId:number, email:string) {
  return `${authDomain}/dataContexts/${classHash}/${escapeFirebaseKey(email)}/interactive_${interactiveId}`
}

export function userDataContextKey(authDomain:string, classHash:string, interactiveId:number, email:string, dataContextId:string) {
  return `${userDataContextsKey(authDomain, classHash, interactiveId, email)}/${dataContextId}`
}

export function groupRootKey(authDomain:string, classHash:string, interactiveId:number) {
  return `${classroomKey(authDomain, classHash)}/interactive_${interactiveId}/groups`
}

export function snapshotsKey(authDomain:string, classHash:string, interactiveId:number) {
  return `${classroomKey(authDomain, classHash)}/snapshots/interactive_${interactiveId}`
}

export function groupUserKey(authDomain:string, classHash:string, interactiveId:number, group: number, email:string) {
  return `${groupRootKey(authDomain, classHash, interactiveId)}/${group}/users/${escapeFirebaseKey(email)}`
}

export function groupUserKeyWithRootKey(rootKey:string, group:number, email:string) {
  return `${rootKey}/${group}/users/${escapeFirebaseKey(email)}`
}

export function demoKey(uid:string) {
  return `demos/${uid}`
}

export function makeRef(key:string) {
  return firebase.database().ref(key)
}

export function makeClassroomRef(authDomain:string, classHash:string) {
  return makeRef(classroomKey(authDomain, classHash))
}

export function makeInteractiveRef(authDomain:string, classHash:string, interactiveId:number) {
  return makeRef(interactiveKey(authDomain, classHash, interactiveId))
}

export function makeUserInteractivesRef(authDomain:string, classHash:string, interactiveId:number, email:string) {
  return makeRef(userInteractivesKey(authDomain, classHash, interactiveId, email))
}

export function makeUserDataContextsRef(authDomain:string, classHash:string, interactiveId:number, email:string) {
  return makeRef(userDataContextsKey(authDomain, classHash, interactiveId, email))
}

export function makeUserDataContextRef(authDomain:string, classHash:string, interactiveId:number, email:string, dataContextId:string) {
  return makeRef(userDataContextKey(authDomain, classHash, interactiveId, email, dataContextId))
}

export function makeDemoRef(uid:string) {
  return makeRef(demoKey(uid))
}

export function makeGroupRootRef(authDomain:string, classHash:string, interactiveId:number) {
  return makeRef(groupRootKey(authDomain, classHash, interactiveId))
}

export function makeSnapshotsRef(authDomain:string, classHash:string, interactiveId:number) {
  return makeRef(snapshotsKey(authDomain, classHash, interactiveId))
}

export function makeGroupUserRef(authDomain:string, classHash:string, interactiveId:number, group: number, email:string) {
  return makeRef(groupUserKey(authDomain, classHash, interactiveId, group, email))
}

export function makeGroupUserRefWithRootKey(groupRootKey:string, group:number, email:string) {
  return makeRef(groupUserKeyWithRootKey(groupRootKey, group, email))
}

export function makeGroupsRefWithRootKey(groupRootKey:string) {
  return makeRef(groupRootKey)
}

export function makeRefFromUrl(url:string) {
  const link:HTMLAnchorElement = document.createElement("A") as HTMLAnchorElement
  link.href = url
  const pathname = decodeURIComponent(link.pathname.substr(1))
  return makeRef(pathname)
}