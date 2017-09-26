import escapeFirebaseKey from "./escape-firebase-key"

export default (url:string|null):string => {
  if (!url) {
    return "none"
  }
  const a = document.createElement("A") as HTMLAnchorElement
  a.href = url
  return escapeFirebaseKey(a.host)
}
