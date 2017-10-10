import escapeFirebaseKey from "./escape-firebase-key"

export default (url:string|null):string => {
  if (!url) {
    return "none"
  }
  const a = document.createElement("A") as HTMLAnchorElement
  a.href = url
  let {host} = a
  // convert demo firebase functions to demo host
  if (host.indexOf("cloudfunctions")) {
    host = "demo"
  }
  return escapeFirebaseKey(host)
}
