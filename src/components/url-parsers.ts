const queryString = require("query-string")
import {AuthoredState} from "./iframe"

export function parseCODAPUrlIntoAuthoredState(url:string, grouped:boolean) {
  const [docStoreUrl, urlQuery, ...restOfUrl] = url.split("?")
  const urlMatches = docStoreUrl.match(/^(https?:\/\/[^/]+\/)v2\/documents\/(\d+)\/(auto)?launch/)
  const launchParams = queryString.parse(urlQuery || "")

  if (!urlMatches || !launchParams.server) {
    throw new Error("This URL does not appear to be a shared URL from the LARA tab in CODAP")
  }

  const [codapUrl, serverQuery, ...restOfServer] = launchParams.server.split("?")
  const codapParams = queryString.parse(serverQuery || "")

  const matchProtocol = (url:string):string => {
    const a = document.createElement("a")
    a.href = url
    a.protocol = location.protocol
    return a.href
  }

  const authoredState:AuthoredState = {
    type: "codap",
    grouped: grouped,
    laraSharedUrl: url,
    docStoreUrl: matchProtocol(urlMatches[1].replace(/\/+$/, "")), // remove trailing slashes
    codapUrl: matchProtocol(codapUrl),
    codapParams: codapParams,
    documentId: urlMatches[2]
  }

  return authoredState
}

export function parseCollaborationSpaceUrlIntoAuthoredState(url:string, grouped:boolean):AuthoredState {
  const [baseUrl, hash, ...rest] = url.split("#")
  const params = queryString.parse(hash || "")

  if (!params.session) {
    throw new Error("No session hash parameter was found in the collaboration space url")
  }

  return {
    type: "collabSpace",
    grouped: grouped,
    fullUrl: url,
    baseUrl: baseUrl,
    session: params.session
  }
}